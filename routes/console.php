<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Check every active alert rule and create notifications for any that trigger.
Schedule::command('alerts:evaluate')->everyFiveMinutes();

// Automatic extreme-weather warnings for every farm with coordinates (no rule needed).
Schedule::command('alerts:weather')->hourly();
