<?php

namespace App\Console\Commands;

use App\Services\AlertRuleEvaluator;
use Illuminate\Console\Command;

class EvaluateAlertRules extends Command
{
    protected $signature = 'alerts:evaluate {--farm= : Only evaluate rules for this farm id}';

    protected $description = 'Check all active alert rules and create notifications for any that trigger';

    public function handle(AlertRuleEvaluator $evaluator): int
    {
        $farm = $this->option('farm');
        $created = $evaluator->runAll($farm !== null ? (int) $farm : null);

        $this->info("Alert rules evaluated. Created {$created} new notification(s).");

        return self::SUCCESS;
    }
}
