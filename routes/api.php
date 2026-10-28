<?php


use App\Http\Controllers\AuthController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\FarmController;
use App\Http\Controllers\Api\FieldController;
use App\Http\Controllers\Api\DailyTaskController;
use App\Http\Controllers\Api\CropProductionController;
use App\Http\Controllers\Api\FarmExpenseController;
use App\Http\Controllers\Api\LivestockController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\SupplierQuotationController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\PurchaseOrderItemController;
use App\Http\Controllers\Api\PurchasePaymentController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\MarketPriceController;
use App\Http\Controllers\Api\SalesOrderController;
use App\Http\Controllers\Api\SalesOrderItemController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\FinanceReportController;
use App\Http\Controllers\Api\FinancialTransactionController;
use App\Http\Controllers\Api\ResourceController;
use App\Http\Controllers\Api\EquipmentController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\CropController;
use App\Http\Controllers\Api\PlantingController;
use App\Http\Controllers\Api\CropMonitoringController;
use App\Http\Controllers\Api\WaterSourceController;
use App\Http\Controllers\Api\IrrigationScheduleController;
use App\Http\Controllers\Api\PumpMonitoringController;
use App\Http\Controllers\Api\ScoutingRecordController;
use App\Http\Controllers\Api\SprayingScheduleController;
use App\Http\Controllers\Api\OutbreakAlertController;
use App\Http\Controllers\Api\WeatherController;
use App\Http\Controllers\Api\HarvestScheduleController;
use App\Http\Controllers\Api\YieldRecordController;
use App\Http\Controllers\Api\PostHarvestHandlingController;
use App\Http\Controllers\Api\StorageFacilityController;
use App\Http\Controllers\Api\StoredProduceController;
use App\Http\Controllers\Api\StockMovementController;
use App\Http\Controllers\Api\DispatchRecordController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\AlertRuleController;
use Illuminate\Support\Facades\Route;
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [PasswordResetController::class, 'send']);
Route::post('/reset-password', [PasswordResetController::class, 'reset']);
Route::get('/invitations/{token}', [InvitationController::class, 'show']);
Route::post('/invitations/accept', [InvitationController::class, 'accept']);

Route::middleware(['auth:sanctum', 'farm.access'])->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::apiResource('users', UserController::class)->except(['store'])->middleware('role:Admin');
    Route::post('users/invitations', [InvitationController::class, 'store'])->middleware('role:Admin');
    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);

    Route::apiResource('daily-tasks', DailyTaskController::class)->middleware('module:tasks');
    Route::apiResource('crop-productions', CropProductionController::class)->middleware('module:agronomy');
    Route::apiResource('crops', CropController::class)->middleware('module:agronomy');
    Route::apiResource('plantings', PlantingController::class)->middleware('module:agronomy');
    Route::apiResource('crop-monitoring', CropMonitoringController::class)->middleware('module:agronomy');
    Route::apiResource('water-sources', WaterSourceController::class)->middleware('module:operations');
    Route::apiResource('irrigation-schedules', IrrigationScheduleController::class)->middleware('module:agronomy');
    Route::apiResource('pump-monitoring', PumpMonitoringController::class)->middleware('module:agronomy');
    Route::apiResource('scouting-records', ScoutingRecordController::class)->middleware('module:agronomy');
    Route::apiResource('spraying-schedules', SprayingScheduleController::class)->middleware('module:agronomy');
    Route::apiResource('outbreak-alerts', OutbreakAlertController::class)->middleware('module:agronomy');
    Route::apiResource('harvest-schedules', HarvestScheduleController::class)->middleware('module:agronomy');
    Route::apiResource('yield-records', YieldRecordController::class)->middleware('module:agronomy');
    Route::apiResource('post-harvest-handlings', PostHarvestHandlingController::class)->middleware('module:agronomy');


    Route::apiResource('farm-expenses', FarmExpenseController::class)->middleware('module:finance');

    // Farm Management
    Route::apiResource('farms', FarmController::class)->middleware('module:farms');
    Route::get('farm-owners', [FarmController::class, 'owners'])->middleware('role:Admin');
    Route::apiResource('fields', FieldController::class)->middleware('module:fields');
    Route::apiResource('farms.fields', FieldController::class)->shallow()->middleware('module:fields');
    Route::get('employees/assignable-users', [EmployeeController::class, 'assignableUsers'])->middleware('module:employees');
    Route::apiResource('employees', EmployeeController::class)->middleware('module:employees');
    Route::apiResource('livestock', LivestockController::class)->middleware('module:operations');

    // Supplier & Procurement
    Route::apiResource('suppliers', SupplierController::class)->middleware('module:commercial');
    Route::apiResource('suppliers.quotations', SupplierQuotationController::class)->shallow()->middleware('module:commercial');
    Route::apiResource('purchase-orders', PurchaseOrderController::class)->middleware('module:commercial');
    Route::apiResource('purchase-orders.items', PurchaseOrderItemController::class)->shallow()->middleware('module:commercial');
    Route::apiResource('purchase-orders.payments', PurchasePaymentController::class)->shallow()->middleware('module:commercial');

    // Sales & Market
    Route::apiResource('customers', CustomerController::class)->middleware('module:commercial');
    Route::apiResource('market-prices', MarketPriceController::class)->middleware('module:commercial');
    Route::apiResource('sales-orders', SalesOrderController::class)->middleware('module:commercial');
    Route::apiResource('sales-orders.items', SalesOrderItemController::class)->shallow()->middleware('module:commercial');
    Route::apiResource('invoices', InvoiceController::class)->middleware('module:commercial');
    Route::apiResource('invoices.payments', PaymentController::class)->shallow()->middleware('module:commercial');

    // Resource / Inventory module
    Route::get('resources/low-stock', [ResourceController::class, 'lowStock'])->middleware('module:operations');
    Route::get('resources/expiring', [ResourceController::class, 'expiring'])->middleware('module:operations');
    Route::apiResource('resources', ResourceController::class)->middleware('module:operations');
    Route::post('resources/{resource}/stock-in', [ResourceController::class, 'stockIn'])->middleware('module:operations');
    Route::post('resources/{resource}/stock-out', [ResourceController::class, 'stockOut'])->middleware('module:operations');

    // Finance module
    Route::apiResource('financial-transactions', FinancialTransactionController::class)->middleware('module:finance');
    Route::apiResource('budgets', BudgetController::class)->middleware('module:finance');

    Route::get('finance/summary', [FinanceReportController::class, 'summary'])->middleware('module:finance');
    Route::get('finance/profit-loss', [FinanceReportController::class, 'profitLoss'])->middleware('module:finance');
    Route::get('finance/cost-per-hectare', [FinanceReportController::class, 'costPerHectare'])->middleware('module:finance');
    Route::get('finance/cost-per-kilogram', [FinanceReportController::class, 'costPerKilogram'])->middleware('module:finance');
    Route::get('finance/budget-vs-actual', [FinanceReportController::class, 'budgetVsActual'])->middleware('module:finance');


    // Equipment & Machinery module
    Route::get('equipment/due-service', [EquipmentController::class, 'dueForService']);
    Route::apiResource('equipment', EquipmentController::class);
    Route::post('equipment/{equipment}/maintenance', [EquipmentController::class, 'storeMaintenance']);
    Route::post('equipment/{equipment}/fuel', [EquipmentController::class, 'storeFuel']);

    // Weather & Environmental Monitoring
    Route::get('weather/current', [WeatherController::class, 'current'])->middleware('module:weather');
    Route::get('weather/forecast', [WeatherController::class, 'forecast'])->middleware('module:weather');
    Route::get('weather/alerts', [WeatherController::class, 'alerts'])->middleware('module:weather');

    // Storage & Post-Harvest
    Route::apiResource('storage-facilities', StorageFacilityController::class)->middleware('module:storage');
    Route::apiResource('stored-produce', StoredProduceController::class)->middleware('module:storage');
    Route::apiResource('stored-produce.stock-movements', StockMovementController::class)->shallow()->middleware('module:storage');
    Route::apiResource('stored-produce.dispatch-records', DispatchRecordController::class)->shallow()->middleware('module:storage');

    // Notifications & Alerts
    Route::apiResource('notifications', NotificationController::class)->middleware('module:notifications');
    Route::post('notifications/{notification}/mark-as-read', [NotificationController::class, 'markAsRead'])->middleware('module:notifications');
    Route::post('alert-rules/evaluate', [AlertRuleController::class, 'evaluate'])->middleware('module:notifications');
    Route::apiResource('alert-rules', AlertRuleController::class)->middleware('module:notifications');
});
