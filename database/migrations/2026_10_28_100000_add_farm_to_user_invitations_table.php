<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_invitations', function (Blueprint $table) {
            if (! Schema::hasColumn('user_invitations', 'farm_id')) {
                $table->foreignId('farm_id')->nullable()->constrained('farms')->cascadeOnDelete();
            }
            if (! Schema::hasColumn('user_invitations', 'hourly_rate')) {
                $table->decimal('hourly_rate', 10, 2)->nullable();
            }
            if (! Schema::hasColumn('user_invitations', 'task_assignment')) {
                $table->string('task_assignment')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('user_invitations', function (Blueprint $table) {
            if (Schema::hasColumn('user_invitations', 'farm_id')) {
                $table->dropConstrainedForeignId('farm_id');
            }
            foreach (['hourly_rate', 'task_assignment'] as $column) {
                if (Schema::hasColumn('user_invitations', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
