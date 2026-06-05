import fs from 'fs';
import ScalaHandler from '../../../../app/services/assets/handlers/scala';
import Constants from '../../../../app/constants/constants';

jest.mock('fs');

describe('services', () => {
  describe('ScalaHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new ScalaHandler().id()).toEqual(`StatWrap.${ScalaHandler.name}`);
      });
    });

    describe('includeFile', () => {
      it('should include Scala files and exclude others', () => {
        const handler = new ScalaHandler();
        // Valid files
        expect(handler.includeFile('/path/to/Test.scala')).toBeTruthy();
        expect(handler.includeFile('/path/to/Main.SCALA')).toBeTruthy();

        // Invalid files
        expect(handler.includeFile('/path/to/Test.class')).toBeFalsy();
        expect(handler.includeFile('/path/to/app.jar')).toBeFalsy();
        expect(handler.includeFile(null)).toBeFalsy();
        expect(handler.includeFile('/path/to/Test.scala.bak')).toBeFalsy();
      });
    });

    describe('getLibraries', () => {
      it('should extract import statements', () => {
        const libraries = new ScalaHandler().getLibraries(
          'test.uri',
          'import scala.collection.mutable.ListBuffer\nimport java.io.File'
        );
        expect(libraries.length).toEqual(2);
        expect(libraries[0]).toMatchObject({
          id: 'scala.collection.mutable.ListBuffer',
          module: 'scala.collection.mutable',
          import: 'ListBuffer',
          alias: null,
        });
        expect(libraries[1]).toMatchObject({
          id: 'java.io.File',
          module: 'java.io',
          import: 'File',
          alias: null,
        });
      });

      it('should detect wildcard imports', () => {
        const libraries = new ScalaHandler().getLibraries(
          'test.uri',
          'import scala.collection.mutable._'
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'scala.collection.mutable._',
          module: 'scala.collection.mutable',
          import: '_',
          alias: null,
        });
      });

      it('should detect import statements with semicolons', () => {
        const libraries = new ScalaHandler().getLibraries(
          'test.uri',
          'import java.lang.Math.PI;'
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'java.lang.Math.PI',
          module: 'java.lang.Math',
          import: 'PI',
          alias: null,
        });
      });
    });

    describe('getInputs', () => {
      it('should detect file read operations', () => {
        const inputs = new ScalaHandler().getInputs(
          'test.uri',
          'val fis = new FileInputStream("input.txt")'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'FileInputStream - "input.txt"',
          type: 'data',
          path: '"input.txt"',
        });
      });

      it('should detect various file read classes', () => {
        const inputs = new ScalaHandler().getInputs(
          'test.uri',
          `
          val fis = new FileInputStream("input1.txt")
          val fr = new FileReader("input2.txt")
          val br = new BufferedReader(new FileReader("input3.txt"))
          val scanner = new Scanner(new File("input4.txt"))
          val data = Files.readAllBytes(Paths.get("input5.txt"))
          val source = Source.fromFile("input6.txt")
          val df = spark.read.csv("input7.csv")
          val rdd = sc.textFile("input8.txt")
          val dfChained = spark.read.option("header", "true").csv("input9.csv")
          `
        );
        expect(inputs.length).toEqual(9);
        expect(inputs[0].id).toContain('BufferedReader');
        expect(inputs[1].id).toContain('FileInputStream');
        expect(inputs[2].id).toContain('FileReader');
        expect(inputs[3].id).toContain('Scanner');
        expect(inputs[4].id).toContain('readAllBytes');
        expect(inputs[5].id).toContain('Source.fromFile');
        expect(inputs[6].id).toContain('csv');
        expect(inputs[7].id).toContain('textFile');
        expect(inputs[8].id).toContain('csv');
      });

      it('should detect JDBC connections', () => {
        const inputs = new ScalaHandler().getInputs(
          'test.uri',
          'val conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/demodatabase")'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'JDBC - "jdbc:mysql://localhost:3306/demodatabase"',
          type: 'data',
          path: '"jdbc:mysql://localhost:3306/demodatabase"',
        });
      });
    });

    describe('getOutputs', () => {
      it('should detect file write operations', () => {
        const outputs = new ScalaHandler().getOutputs(
          'test.uri',
          `
          val fos = new FileOutputStream("output1.txt")
          val fw = new FileWriter("output2.txt")
          val bw = new BufferedWriter(new FileWriter("output3.txt"))
          val pw = new PrintWriter("output4.txt")
          `
        );
        expect(outputs.length).toEqual(4);
        expect(outputs[0].id).toContain('BufferedWriter');
        expect(outputs[1].id).toContain('FileOutputStream');
        expect(outputs[2].id).toContain('FileWriter');
        expect(outputs[3].id).toContain('PrintWriter');
      });

      it('should detect various file write operations', () => {
        const outputs = new ScalaHandler().getOutputs(
          'test.uri',
          `
          val fos = new FileOutputStream("output1.txt")
          val fw = new FileWriter("output2.txt")
          val pw = new PrintWriter("output4.txt")
          df.write.parquet("output5.parquet")
          df.write.mode("overwrite").parquet("output6.parquet")
          `
        );
        expect(outputs.length).toEqual(5);
        expect(outputs[0].id).toContain('FileOutputStream');
        expect(outputs[1].id).toContain('FileWriter');
        expect(outputs[2].id).toContain('PrintWriter');
        expect(outputs[3].id).toContain('parquet');
        expect(outputs[4].id).toContain('parquet');
      });

      it('should detect image write operations', () => {
        const outputs = new ScalaHandler().getOutputs(
          'test.uri',
          'ImageIO.write(bufferedImage, "png", new File("chart.png"))'
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'ImageIO.write - "chart.png"',
          type: 'figure',
          path: '"chart.png"',
        });
      });

      it('should detect chart export operations', () => {
        const outputs = new ScalaHandler().getOutputs(
          'test.uri',
          `
          ChartUtilities.saveChartAsPNG(new File("chart1.png"), chart, 500, 300)
          ChartUtils.saveChartAsJPEG(new File("chart2.jpg"), chart, 500, 300)
          `
        );
        expect(outputs.length).toEqual(2);
        expect(outputs[0].id).toContain('chart1.png');
        expect(outputs[0].type).toEqual('figure');
        expect(outputs[1].id).toContain('chart2.jpg');
        expect(outputs[1].type).toEqual('figure');
      });
    });

    describe('scan', () => {
      it('should return metadata for a valid Scala file', () => {
        fs.readFileSync.mockReturnValue('import scala.collection.mutable.ListBuffer\nclass Test {}');

        const testAsset = {
          uri: '/path/to/Test.scala',
          type: 'file',
          metadata: [],
        };

        const response = new ScalaHandler().scan(testAsset);
        expect(response.metadata[0]).toMatchObject({
          id: 'StatWrap.ScalaHandler',
          libraries: [
            {
              id: 'scala.collection.mutable.ListBuffer',
              module: 'scala.collection.mutable',
              import: 'ListBuffer',
            }
          ]
        });
      });
    });
  });
});
