<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('farm_id')->nullable()->constrained('farms')->nullOnDelete();
            $table->string('type'); // e.g. vaccination, low_stock, harvest, irrigation, market, weather
            $table->string('title');
            $table->text('message');
            $table->string('priority')->default('Normal'); // Low, Normal, High, Urgent
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        Schema::create('alert_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->string('type'); // matches notifications.type
            $table->string('trigger_condition'); // e.g. "stock below threshold", "3 days before due date"
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alert_rules');
        Schema::dropIfExists('notifications');
    }
};