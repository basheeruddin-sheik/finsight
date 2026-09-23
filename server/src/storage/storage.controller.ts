import { Controller, Post, Body } from '@nestjs/common';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly service: StorageService) {}

  // Browser asks for one signed upload URL per image it wants to send.
  @Post('upload-urls')
  uploadUrls(@Body() body: { contentTypes: string[] }) {
    return this.service.createUploadUrls(body.contentTypes);
  }

  // Browser asks for short-lived signed URLs to render its receipts.
  @Post('view-urls')
  viewUrls(@Body() body: { paths: string[] }) {
    return this.service.createViewUrls(body.paths);
  }
}
