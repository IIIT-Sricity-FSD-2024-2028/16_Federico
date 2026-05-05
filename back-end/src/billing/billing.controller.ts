import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { BillingService } from './billing.service';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { 
  CreateServiceDto, CreateLedgerDto, CreateLedgerEntryDto, 
  CreatePaymentDto, CreateDischargeSummaryDto 
} from './dto/billing.dto';

@ApiTags('Billing')
@ApiHeader({ name: 'x-role', description: 'User role (ADMIN or SUPER_USER)' })
@Controller('billing')
export class BillingController {
  private readonly logger = new Logger('💰 Billing');

  constructor(private readonly billingService: BillingService) {}

  // Services
  @Get('services')
  @ApiOperation({ summary: 'Get all billable services' })
  @Roles('ADMIN', 'SUPER_USER')
  findAllServices() {
    return this.billingService.findAllServices();
  }

  @Post('services')
  @ApiOperation({ summary: 'Create a new billable service' })
  @Roles('SUPER_USER')
  createService(@Body() service: CreateServiceDto) {
    return this.billingService.createService(service);
  }

  // Ledger
  @Get('ledger/:admissionId')
  @ApiOperation({ summary: 'Get ledger for an admission' })
  @Roles('ADMIN', 'SUPER_USER')
  findLedgerByAdmission(@Param('admissionId') admissionId: string) {
    return this.billingService.findLedgerByAdmission(+admissionId);
  }

  @Post('ledger')
  @ApiOperation({ summary: 'Create a ledger for an admission' })
  @Roles('SUPER_USER')
  createLedger(@Body() ledger: CreateLedgerDto) {
    const result = this.billingService.createLedger(ledger);
    this.logger.log(`📔 LEDGER CREATED  id=${result.ledger_id}  admission_id=${result.admission_id}`);
    return result;
  }

  // Ledger Entries
  @Get('ledger/:ledgerId/entries')
  @ApiOperation({ summary: 'Get all entries for a ledger' })
  @Roles('ADMIN', 'SUPER_USER')
  findLedgerEntries(@Param('ledgerId') ledgerId: string) {
    return this.billingService.findLedgerEntries(+ledgerId);
  }

  @Post('ledger/entry')
  @ApiOperation({ summary: 'Add a ledger entry' })
  @Roles('SUPER_USER')
  addLedgerEntry(@Body() entry: CreateLedgerEntryDto) {
    const result = this.billingService.addLedgerEntry(entry);
    this.logger.log(`➕ LEDGER ENTRY ADDED  ledger_id=${result.ledger_id}  service_id=${result.service_id}  amount=${result.amount}`);
    return result;
  }

  // Payments
  @Get('payments')
  @ApiOperation({ summary: 'Get all payments' })
  @Roles('ADMIN', 'SUPER_USER')
  findAllPayments() {
    return this.billingService.findAllPayments();
  }

  @Post('payments')
  @ApiOperation({ summary: 'Create a new payment' })
  @Roles('SUPER_USER')
  createPayment(@Body() payment: CreatePaymentDto) {
    const result = this.billingService.createPayment(payment);
    this.logger.log(`💳 PAYMENT CREATED  id=${result.payment_id}  ledger_id=${result.ledger_id}  amount=${result.amount_paid}`);
    return result;
  }

  // Discharge Summary
  @Post('discharge-summary')
  @ApiOperation({ summary: 'Create a discharge summary' })
  @Roles('SUPER_USER')
  createSummary(@Body() summary: CreateDischargeSummaryDto) {
    const result = this.billingService.createDischargeSummary(summary);
    this.logger.log(`📄 DISCHARGE SUMMARY CREATED  id=${result.summary_id}  admission_id=${result.admission_id}`);
    return result;
  }
}
