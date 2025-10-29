declare module 'pptxgenjs' {
  export default class PptxGenJS {
    layout: string;
    ShapeType: any;
    addSlide(): any;
    writeFile(options: { fileName: string }): Promise<void>;
  }
}

