/* eslint-disable camelcase */
import { Python3Listener } from 'dt-python-parser';

export default class StatWrapPythonListener extends Python3Listener {
  // eslint-disable-next-line camelcase
  enterImport_name(ctx): void {
    console.log(ctx.getText());
    const importName = ctx
      .getText()
      .toLowerCase()
      .match(/(?<=import).+/)?.[0];
    console.log('ImportName', importName);
  }

  enterImport_stmt(ctx): void {
    console.log(ctx.getText());
    const importName = ctx
      .getText()
      .toLowerCase()
      .match(/(?<=import).+/)?.[0];
    console.log('Statement', importName);
  }

  enterImport_from(ctx): void {
    console.log(ctx.getText());
    const importName = ctx
      .getText()
      .toLowerCase()
      .match(/(?<=import).+/)?.[0];
    console.log('From', importName);
  }

  enterImport_as_name(ctx): void {
    console.log(ctx.getText());
    const importName = ctx
      .getText()
      .toLowerCase()
      .match(/(?<=import).+/)?.[0];
    console.log('AsName', importName);
  }

  enterDotted_as_name(ctx): void {
    console.log(ctx.getText());
    const importName = ctx
      .getText()
      .toLowerCase()
      .match(/(?<=import).+/)?.[0];
    console.log('DottedAsName', importName);
  }

  enterImport_as_names(ctx): void {
    console.log(ctx.getText());
    const importName = ctx
      .getText()
      .toLowerCase()
      .match(/(?<=import).+/)?.[0];
    console.log('AsNames', importName);
  }

  enterDotted_as_names(ctx): void {
    console.log(ctx.getText());
    const importName = ctx
      .getText()
      .toLowerCase()
      .match(/(?<=import).+/)?.[0];
    console.log('DottedAsNames', importName);
  }
}
