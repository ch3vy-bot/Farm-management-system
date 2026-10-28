<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertRule extends Model
{
    /**
     * Rule types the evaluator understands.
     * 'default' is used when no threshold is given; 'unit' describes what the threshold means.
     */
    public const TYPES = [
        'low_stock' => [
            'label' => 'Low stock',
            'unit' => 'units remaining',
            'default' => 50,
        ],
        'maintenance_due' => [
            'label' => 'Equipment maintenance due',
            'unit' => 'days ahead',
            'default' => 7,
        ],
        'vaccination_due' => [
            'label' => 'Livestock vaccination due',
            'unit' => 'days ahead',
            'default' => 7,
        ],
        'harvest_due' => [
            'label' => 'Harvest coming up',
            'unit' => 'days ahead',
            'default' => 3,
        ],
        'task_overdue' => [
            'label' => 'Overdue tasks',
            'unit' => 'days overdue',
            'default' => 1,
        ],
        'weather' => [
            'label' => 'Weather alert',
            'unit' => null,
            'default' => null,
        ],
    ];

    protected $fillable = [
        'farm_id',
        'user_id',
        'type',
        'trigger_condition',
        'threshold',
        'priority',
        'is_active',
        'last_run_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'threshold' => 'integer',
        'last_run_at' => 'datetime',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    /**
     * Normalise a stored type ("Low Stock", "low-stock", "weather_alert") to a known key, or null.
     */
    public static function normalizeType(?string $type): ?string
    {
        $key = strtolower(trim((string) $type));
        $key = str_replace([' ', '-'], '_', $key);

        if ($key === 'weather_alert') {
            $key = 'weather';
        }

        return array_key_exists($key, self::TYPES) ? $key : null;
    }

    /**
     * Human-readable sentence shown in the "Triggers when" column.
     */
    public static function describe(string $type, ?int $threshold): string
    {
        $threshold ??= self::TYPES[$type]['default'] ?? null;

        return match ($type) {
            'low_stock' => "Stored produce of any crop falls to {$threshold} units or less",
            'maintenance_due' => "Equipment service is due within {$threshold} days (or overdue)",
            'vaccination_due' => "A livestock vaccination is due within {$threshold} days (or overdue)",
            'harvest_due' => "A scheduled harvest is within {$threshold} days",
            'task_overdue' => "Tasks are still not completed {$threshold} day(s) after their date",
            'weather' => 'The weather forecast for the farm contains a warning',
            default => $type,
        };
    }
}
