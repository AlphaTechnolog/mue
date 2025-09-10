#!/usr/bin/env bun

declare const Bun: any;
declare const process: any;

const [header] = process.argv.slice(2);
if (!header) process.exit(1);

type Items = Record<string, string | number | boolean>;

type EnumData = {
  name: string;
  contents: string;
  items: Items;
};

const itemsFor = (contents: string): Items => {
  const result: Items = {};
  for (const line of contents.split("\n")) {
    const exclussions = ["{", "}", "typedef", "enum", "//"];
    if (line.length === 0 || exclussions.some(x => line.trim().startsWith(x))) continue;
    const [key, value] = line
      .replace(",", "")
      .replace(/\/\/.*/, "")
      .split("=")
      .map(x => x.trim()) as (string | undefined)[];

    if (!key) {
      console.error("cannot obtain key for enum with line", line);
      process.exit(1);
    }

    let parsedValue: string | number | boolean | undefined = value;
    if (parsedValue === undefined) {
      const keys = Object.keys(result);
      if (keys.length === 0) {
        parsedValue = 0;
      } else {
        const lastKey = keys[keys.length - 1];
        const lastValue = result[lastKey];
        if (typeof(lastValue) !== "number") {
          console.error("cannot determine automatic value for enum item with key", key, "and no value");
          console.error("registered keys looks like", JSON.stringify(result));
          process.exit(1);
        }
        parsedValue = String(lastValue as number + 1);
      }
    }

    if (!isNaN(Number(parsedValue))) {
      parsedValue = Number(parsedValue);
    } else if (parsedValue === "true" || parsedValue === "false") {
      parsedValue = Boolean(parsedValue);
    }
    result[key!] = parsedValue;
  }

  return result;
}

async function main() {
  const file = Bun.file(header);
  const text = await file.text();

  let readBuffer: string = "";
  let reading = false;

  let enums: EnumData[] = [];

  for (const line of text.split("\n") as string[]) {
    if (line.startsWith("typedef enum")) {
      reading = true;
      readBuffer += line + '\n';
      continue;
    }
    // second case enum
    if (line.startsWith("enum")) {
      reading = true;
      readBuffer += line + '\n';
      continue;
    }
    if (reading === false) continue;
    readBuffer += line + '\n';
    let match: RegExpMatchArray | null;
    if ((match = line.match(/} (.*);/))) {
      reading = false;
      enums.push({
        name: match[1],
        contents: readBuffer,
        items: itemsFor(readBuffer),
      });
      readBuffer = "";
    }

    // end of second case enum, starts with enum } instead of typedef, and has no name.
    // to determine name we'll use the prefix of every item.
    if (line.startsWith("}")) {
      reading = false;
      if (readBuffer.length === 0) {
        readBuffer = "";
        continue;
      }
      const items = itemsFor(readBuffer);
      let apparentPrefix: string | undefined = undefined;
      for (const key of Object.keys(items)) {
        if (apparentPrefix === undefined) {
          apparentPrefix = key.split("_")[0];
          apparentPrefix = apparentPrefix.charAt(0).toUpperCase() + apparentPrefix.slice(1).toLowerCase();
          continue;
        }
        let prefix = key.split("_")[0];
        prefix = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
        if (prefix !== apparentPrefix) {
          console.error("[1] unable to determine name for unnamed enum with contents:\n" + readBuffer);
          process.exit(1);
        }
      }
      if (apparentPrefix === undefined) {
        console.error("[2] unable to determine name for unnamed enum with contents:\n" + readBuffer);
        process.exit(1);
        return;
      }

      enums.push({
        name: apparentPrefix,
        contents: readBuffer,
        items,
      });
      readBuffer = "";
    }
  }

  let organisedEnums: EnumData[] = [];
  for (const data of enums) {
    let existent = false;
    for (const el of organisedEnums) {
      if (data.name === el.name) {
        existent = true;
        for (const [key, val] of Object.entries(data.items)) {
          el.items[key] = val;
        }
        break;
      }
    }
    if (existent === false) {
      organisedEnums.push(data);
    }
  }

  organisedEnums.forEach(({ name, items }) => {
    let i = 0;
    const entries = Object.entries(items);
    console.log(`var ${name} = {`);
    for (const [key, val] of entries) {
      const [_, ...parts] = key.split("_");
      const newKey = parts.map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()).join("");
      const comma = i++ < entries.length - 1 ? "," : "";
      console.log(`  ${newKey}: ${String(val)}${comma}`);
    }
    console.log("};\n");
  });
}

main();
