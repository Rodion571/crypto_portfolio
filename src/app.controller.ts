import { Controller, Get, Res } from '@nestjs/common';
import { join } from 'path';

@Controller()
export class AppController {
  @Get()
  getHome(@Res() res: any) {
    const filePath = join(__dirname, '..', 'public', 'index.html');
    return res.sendFile(filePath);
  }

  @Get('style/style.css')
  getStyle(@Res() res: any) {
    const filePath = join(__dirname, '..', 'public', 'style', 'style.css');
    return res.sendFile(filePath);
  }
}