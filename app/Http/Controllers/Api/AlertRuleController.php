<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AlertRule;
use App\Services\AlertRuleEvaluator;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AlertRuleController extends Controller
{
    public function __construct(private AlertRuleEvaluator $evaluator)
    {
    }

    public function index(Request $request)
    {
        $query = AlertRule::query();

        if ($request->has('farm_id')) {
            $query->where('farm_id', $request->input('farm_id'));
        }
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'farm_id' => 'required|exists:farms,id',
            'type' => ['required', 'string', Rule::in(array_keys(AlertRule::TYPES))],
            'threshold' => 'nullable|integer|min:0',
            'priority' => ['nullable', Rule::in(['Low', 'Normal', 'High', 'Urgent'])],
            'is_active' => 'nullable|boolean',
        ]);

        $validated['threshold'] = $validated['threshold'] ?? (AlertRule::TYPES[$validated['type']]['default'] ?? null);
        $validated['priority'] = $validated['priority'] ?? 'Normal';
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['trigger_condition'] = AlertRule::describe($validated['type'], $validated['threshold']);
        $validated['user_id'] = $request->user()?->id;

        $alertRule = AlertRule::create($validated);

        // Check right away so matching notifications appear without waiting for the scheduler.
        $created = $alertRule->is_active ? $this->evaluator->run($alertRule) : 0;

        return response()->json(array_merge($alertRule->fresh()->toArray(), [
            'notifications_created' => $created,
        ]), 201);
    }

    public function show(AlertRule $alertRule)
    {
        return response()->json($alertRule);
    }

    public function update(Request $request, AlertRule $alertRule)
    {
        $validated = $request->validate([
            'type' => ['sometimes', 'string', Rule::in(array_keys(AlertRule::TYPES))],
            'threshold' => 'nullable|integer|min:0',
            'priority' => ['nullable', Rule::in(['Low', 'Normal', 'High', 'Urgent'])],
            'is_active' => 'nullable|boolean',
        ]);

        $alertRule->fill(array_filter($validated, fn ($value) => $value !== null));

        if ($request->has('type') || $request->has('threshold')) {
            $normalized = AlertRule::normalizeType($alertRule->type);
            if ($normalized !== null) {
                $alertRule->trigger_condition = AlertRule::describe($normalized, $alertRule->threshold);
            }
        }

        $alertRule->save();

        $created = $alertRule->is_active ? $this->evaluator->run($alertRule) : 0;

        return response()->json(array_merge($alertRule->fresh()->toArray(), [
            'notifications_created' => $created,
        ]));
    }

    public function destroy(AlertRule $alertRule)
    {
        $alertRule->delete();

        return response()->json(null, 204);
    }

    /**
     * Run all active rules now (optionally for one farm). Also handy where no scheduler is available.
     */
    public function evaluate(Request $request)
    {
        $farmId = $request->filled('farm_id') ? (int) $request->input('farm_id') : null;

        return response()->json([
            'created' => $this->evaluator->runAll($farmId) + $this->evaluator->runExtremeWeather($farmId),
        ]);
    }
}
