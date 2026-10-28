<?php

namespace App\Console\Commands;

use App\Services\AlertRuleEvaluator;
use Illuminate\Console\Command;

class CheckExtremeWeather extends Command
{
    protected $signature = 'alerts:weather {--farm= : Only check this farm id}';

    protected $description = 'Check each farm\'s forecast and notify its owner and managers about extreme weather';

    public function handle(AlertRuleEvaluator $evaluator): int
    {
        $farm = $this->option('farm');
        $created = $evaluator->runExtremeWeather($farm !== null ? (int) $farm : null);

        $this->info("Extreme weather check done. Created {$created} new notification(s).");

        return self::SUCCESS;
    }
}
