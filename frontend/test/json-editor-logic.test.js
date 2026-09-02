import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  convertKeyCase,
  convertAllKeysCase,
  maskPiiData,
  autoFixMalformedJsonText,
  tryParseJsonString,
  unpackAllStringifiedJson,
  generateDefaultFromSchema,
  formatJsonPath,
  getValueAtPath,
  setValueAtPath,
  deleteValueAtPath,
} from "../modules/json-editor-logic.js";

describe("convertKeyCase", () => {
  it("converts snake_case to camelCase", () => {
    assert.equal(convertKeyCase("user_first_name", "camel"), "userFirstName");
  });
  it("converts camelCase to snake_case", () => {
    assert.equal(convertKeyCase("userFirstName", "snake"), "user_first_name");
  });
  it("converts to kebab-case", () => {
    assert.equal(convertKeyCase("userFirstName", "kebab"), "user-first-name");
  });
  it("converts to PascalCase", () => {
    assert.equal(convertKeyCase("user_first_name", "pascal"), "UserFirstName");
  });
});

describe("convertAllKeysCase", () => {
  it("recursively converts nested keys", () => {
    const input = { first_name: "John", profile_meta: { login_ip: "1.1.1.1" } };
    const res = convertAllKeysCase(input, "camel");
    assert.equal(res.firstName, "John");
    assert.equal(res.profileMeta.loginIp, "1.1.1.1");
  });
});

describe("maskPiiData", () => {
  it("masks emails and phones", () => {
    assert.equal(maskPiiData("budi.santoso@example.com"), "bu***@example.com");
    assert.equal(maskPiiData("+6281234567890"), "+62****90");
  });

  it("masks passwords and secrets in objects", () => {
    const res = maskPiiData({
      username: "budi",
      user_password: "secretpassword",
      auth_token: "xyz123",
    });
    assert.equal(res.username, "budi");
    assert.equal(res.user_password, "********");
    assert.equal(res.auth_token, "********");
  });
});

describe("autoFixMalformedJsonText", () => {
  it("fixes single quotes, unquoted keys, and trailing commas", () => {
    const raw = "{\n  name: 'Budi',\n  age: 25,\n}";
    const fixed = autoFixMalformedJsonText(raw);
    const parsed = JSON.parse(fixed);
    assert.equal(parsed.name, "Budi");
    assert.equal(parsed.age, 25);
  });
});

describe("tryParseJsonString and unpackAllStringifiedJson", () => {
  it("unpacks nested JSON strings", () => {
    const input = {
      order_id: "ORD-1",
      payload: '{"items":[{"id":10}]}',
    };
    const unpacked = unpackAllStringifiedJson(input);
    assert.equal(unpacked.payload.items[0].id, 10);
  });
});

describe("generateDefaultFromSchema", () => {
  it("creates template from schema", () => {
    const schema = {
      id: 101,
      name: "Product",
      active: true,
      tags: ["tag1"],
      spec: { weight: 100 },
    };
    const def = generateDefaultFromSchema(schema);
    assert.deepEqual(def, {
      id: 0,
      name: "",
      active: false,
      tags: [""],
      spec: { weight: 0 },
    });
  });
});

describe("formatJsonPath & path accessors", () => {
  it("formats jsonpath accurately", () => {
    assert.equal(formatJsonPath([]), "$");
    assert.equal(formatJsonPath(["users", 0, "name"]), "$.users[0].name");
  });

  it("gets, sets, and deletes by path", () => {
    const obj = { a: { b: [10, 20] } };
    assert.equal(getValueAtPath(obj, ["a", "b", 1]), 20);

    setValueAtPath(obj, ["a", "b", 1], 30);
    assert.equal(getValueAtPath(obj, ["a", "b", 1]), 30);

    deleteValueAtPath(obj, ["a", "b", 0]);
    assert.deepEqual(getValueAtPath(obj, ["a", "b"]), [30]);
  });
});
