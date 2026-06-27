const { bookToCode, parseReference, humanBook } = require("../bibleRef");

describe("bookToCode", () => {
  test("maps full names, abbreviations, and numbered books", () => {
    expect(bookToCode("Genesis")).toBe("GEN");
    expect(bookToCode("psalm")).toBe("PSA");
    expect(bookToCode("Psalms")).toBe("PSA");
    expect(bookToCode("Ps")).toBe("PSA");
    expect(bookToCode("Matt")).toBe("MAT");
    expect(bookToCode("Mt")).toBe("MAT");
    expect(bookToCode("John")).toBe("JHN");
    expect(bookToCode("Phil")).toBe("PHP");
    expect(bookToCode("Song of Songs")).toBe("SNG");
  });

  test("tolerates spacing variants on numbered books", () => {
    expect(bookToCode("1 Corinthians")).toBe("1CO");
    expect(bookToCode("1 Cor")).toBe("1CO");
    expect(bookToCode("1cor")).toBe("1CO");
    expect(bookToCode("1co")).toBe("1CO");
    expect(bookToCode("2 Tim")).toBe("2TI");
    expect(bookToCode("3 John")).toBe("3JN");
  });

  test("rejects unknown books", () => {
    expect(bookToCode("Hezekiah")).toBeNull();
    expect(bookToCode("notabook")).toBeNull();
  });
});

describe("parseReference", () => {
  test("single verse → USFM verse id", () => {
    expect(parseReference("John 3:16")).toMatchObject({
      code: "JHN", chapter: 3, verse: 16, endVerse: null, id: "JHN.3.16", reference: "John 3:16",
    });
  });

  test("verse range → USFM passage id", () => {
    expect(parseReference("1 Corinthians 13:4-7")).toMatchObject({
      code: "1CO", id: "1CO.13.4-1CO.13.7", reference: "1 Corinthians 13:4-7",
    });
  });

  test("chapter only → chapter id", () => {
    expect(parseReference("Psalm 23")).toMatchObject({
      code: "PSA", chapter: 23, verse: null, id: "PSA.23",
    });
  });

  test("abbreviations and en-dash ranges", () => {
    expect(parseReference("Phil 4:13").id).toBe("PHP.4.13");
    expect(parseReference("2 Tim 1:7").id).toBe("2TI.1.7");
    expect(parseReference("Romans 8:38–39").id).toBe("ROM.8.38-ROM.8.39");
  });

  test("rejects fabricated books, malformed input, and inverted ranges", () => {
    expect(parseReference("Hezekiah 3:16")).toBeNull();
    expect(parseReference("John")).toBeNull(); // no chapter
    expect(parseReference("")).toBeNull();
    expect(parseReference("John 3:20-15")).toBeNull(); // end < start
  });
});

test("humanBook returns a clean display name", () => {
  expect(humanBook("JHN")).toBe("John");
  expect(humanBook("1CO")).toBe("1 Corinthians");
});
