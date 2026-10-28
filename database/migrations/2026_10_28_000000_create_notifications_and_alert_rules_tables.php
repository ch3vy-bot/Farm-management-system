<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Creates the notifications and alert_rules tables (they had no migration),
 * or upgrades them in place if they already exist from an earlier setup.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('farm_id')->nullable()->constrained('farms')->cascadeOnDelete();
                $table->string('type');
                $table->string('title');
                $table->text('message');
                $table->string('priority')->default('Normal'); // Low, Normal, High, Urgent
                $table->timestamp('read_at')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'read_at']);
            });
        }

        if (! Schema::hasTable('alert_rules')) {
            Schema::create('alert_rules', function (Blueprint $table) {
                $table->id();
                $table->foreignId('farm_id')->constrained('farms')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('type');
                $table->string('trigger_condition');
                $table->unsignedInteger('threshold')->nullable();
                $table->string('priority')->default('Normal');
                $table->boolean('is_active')->default(true);
                $table->timestamp('last_run_at')->nullable();
                $table->timestamps();
            });
        } else {
            Schema::table('alert_rules', function (Blueprint $table) {
                if (! Schema::hasColumn('alert_rules', 'user_id')) {
                    $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('alert_rules', 'threshold')) {
                    $table->unsignedInteger('threshold')->nullable();
                }
                if (! Schema::hasColumn('alert_rules', 'priority')) {
                    $table->string('priority')->default('Normal');
                }
                if (! Schema::hasColumn('alert_rules', 'last_run_at')) {
                    $table->timestamp('last_run_at')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        // Intentionally left empty: these tables may predate this migration.
    }
};
