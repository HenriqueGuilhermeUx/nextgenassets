import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { EfiOperationsGuard } from './efi-operations.guard';
import { EfiStatementReadService } from './efi-statement-read.service';

/** Operator-only report requests/preview; no bank transfers, no CSV exposure. */
@Controller('admin/efi-statement-read')
@UseGuards(EfiOperationsGuard)
export class EfiStatementReadController {
  constructor(private readonly service:EfiStatementReadService){}

  @Get('preflight')
  preflight(){return this.service.configurationPreflight();}

  @Post('request')
  request(@Body() body:any){return this.service.requestStatement(body?.movementDate);}

  @Post('preview')
  preview(@Body() body:any){
    return this.service.previewStatement(body?.reportId,body);
  }
}
