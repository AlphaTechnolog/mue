#!/usr/bin/env bun

import "./globals.d";

type SymbolInfo = {
  datatype: string;
  name: string;
};

function collect(str: string, char: string): [string, string] {
  const parts = str.split(char);
  const chars = char.repeat(parts.length - 1);
  const stripped = parts.join("");
  return [stripped, chars];
}

type FuncInfo = {
  name: string;
  outName: string;
  returnType: string;
  params: Array<SymbolInfo>;
};

function getFuncInfo(decl: string, outName: string): FuncInfo | undefined {
  const match = decl.match(/(.*) (.*)\((.*)\)/);
  if (!match) {
    return undefined;
  }

  const [returnTypeOrig, funcNameOrig, params] = match.slice(1);
  const [strippedFun, funPointers] = collect(`${returnTypeOrig} ${funcNameOrig}`, "*");
  let [returnType, funcName] = strippedFun.split(" ");
  returnType += funPointers;

  return {
    name: funcName,
    outName,
    returnType,
    params: params.length === 0 || params[0].length === 0 ? [] : params.split(",").map(x => {
      const [stripped, pointers] = collect(x.trim(), "*");
      let [datatype, name] = stripped.split(" ");
      datatype += pointers;
      return { datatype, name };
    }),
  };
}

type StructInfo = {
  name: string;
  fields: Array<SymbolInfo>;
};

type StructIndex = Map<string, StructInfo>;

const indexStructs = (structs: Array<StructInfo>): StructIndex => {
  const result: StructIndex = new Map();
  structs.forEach((x) => result.set(x.name, x));
  return result;
}

function getStructName(line: string): string {
  const match = line.match(/struct (.*) \{/);
  if (!match) {
    console.error(`Invalid syntax: ${line} (cannot find struct name)\n`);
    process.exit(1);
  }
  return match![1];
}

function parseStructField(line: string): SymbolInfo {
  const [stripped, pointers] = collect(line, "*");
  let [datatype, name] = stripped.split(" ");
  datatype += pointers;
  return { datatype, name };
}

function showStructInfo(info: StructInfo) {
  console.log(`struct ${info.name}`);
  info.fields.forEach(field => {
    console.log(`    ${field.datatype}: ${field.name}`);
  });
}

const typemaps = {
  "int": "number",
  "int*": "number",
  "double": "number",
  "float": "number",
  "char": "string",
  "char*": "string",
  "bool": "boolean",
  "bool*": "boolean",
};

const ctypes = {
  "string": "char*",
  "number": "double",
  "boolean": "int",
};

const noPointer = (datatype: string): string => datatype.replace("*", "");

function compileFuncInfo(structsIndex: StructIndex, funcInfo: FuncInfo): string {
  let buffer = "";
  buffer += `void ${funcInfo.outName}(js_State *J) {\n`;

  funcInfo.params.forEach(({ datatype, name }, idx) => {
    if (datatype.endsWith("**")) {
      console.error(`Unable to compile ${funcInfo.outName}:${funcInfo.name}. Reason: datatype of ptr type: ${datatype} (${name}) is not supported yet.`);
      process.exit(1);
    }
    const jsType = typemaps[datatype as keyof typeof typemaps] ?? "object";
    buffer += `    if (!js_is${jsType}(J, ${idx + 1})) {\n`;
    buffer += `        js_typeerror(J, "argument is not ${jsType}");\n`;
    buffer += `        return;\n`;
    buffer += `    }\n`
  });

  funcInfo.params.forEach(({ datatype, name }, idx) => {
    if (noPointer(datatype) in typemaps) {
      const jsType = typemaps[datatype as keyof typeof typemaps];
      const ctype = ctypes[jsType as keyof typeof ctypes];
      buffer += `\n    ${noPointer(ctype)} ${name} = js_to${jsType}(J, ${idx + 1});\n`;
      return;
    }

    const structDefinition = structsIndex.get(noPointer(datatype));
    if (!structDefinition) {
      console.error(`Invalid given datatype ${datatype}, make sure it is a defined type before using.`);
      process.exit(1);
      return;
    }

    buffer += `\n    ${noPointer(datatype)} ${name} = {0};\n`;
    structDefinition.fields.forEach((field, index) => {
      const jsType = typemaps[field.datatype as keyof typeof typemaps];
      buffer += `    js_getproperty(J, ${idx + 1}, ${field.name});\n`;
      buffer += `    ${name}.${field.name} = js_to${jsType}(J, -1);\n`;
      buffer += "    js_pop(J, 1);\n";
    });
  });

  const paramsList = funcInfo.params.map(x => {
    if (x.datatype.endsWith("*")) {
      return `&${x.name}`;
    } else {
      return x.name;
    }
  }).join(", ");
  const returnctype = typemaps[funcInfo.returnType.replace("*", "") as keyof typeof typemaps] ?? "undefined";
  switch (returnctype) {
    case "undefined": {
      buffer += `\n    ${funcInfo.name}(${paramsList});`;
      buffer += "\n    js_pushundefined(J);\n";
      break;
    }
    default: {
      buffer += `\n    js_push${returnctype}(J, ${funcInfo.name}(${paramsList}));\n`;
      break;
    }
  }

  buffer += "}\n";
  return buffer;
}

async function main() {
  const [filename] = process.argv.slice(2);
  const file = Bun.file(filename);
  const contents: string = await file.text();

  let rawStructs: string = "";
  let rawFunctions: string = "";

  let readingStruct = false;
  contents.split("\n").forEach(x => {
    if (x.length === 0) return;
    x += "\n"; // xd
    if (x.startsWith("struct")) {
      readingStruct = true;
      rawStructs += x;
      return;
    }
    if (readingStruct) {
      rawStructs += x;
      if (x === "}\n") {
        readingStruct = false;
      }
      return;
    }
    rawFunctions += x;
  });

  let structInfos: StructInfo[] = [];
  let reading = false;
  let currentInfo: Partial<StructInfo> = {};
  rawStructs.split("\n").forEach(line => {
    if (line.startsWith("struct")) {
      reading = true;
      currentInfo.name = getStructName(line.trim());
      return;
    }
    if (reading && line.startsWith("}")) {
      reading = false;
      structInfos.push(currentInfo as StructInfo);
      currentInfo = {};
      return;
    }
    if (reading) {
      (currentInfo.fields ??= []).push(parseStructField(line.trim()));
      return;
    }
  });

  const indexedStructs = indexStructs(structInfos);

  const funcInfos: FuncInfo[] = rawFunctions.split("\n").map((line: string) => {
    if (line.length === 0) return undefined;
    let [fn, jsName] = line.split("//").map(x => x.trim());
    if (!jsName) jsName = prompt("Write func name for `" + fn + "`:") || process.exit(1);
    return getFuncInfo(fn, jsName);
  }).filter((x: FuncInfo | undefined) => x !== undefined);

  const compiledFunctions = funcInfos.reduce((prev, cur) => {
    const compiled = compileFuncInfo(indexedStructs, cur);
    return prev + compiled + "\n";
  }, "").trim();

  console.log(compiledFunctions);
}

main();
