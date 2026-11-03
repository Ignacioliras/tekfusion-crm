import { bucketPathFromUrl, signRecordFiles, signUrl } from "./signedUrls";

const PUBLIC = "http://127.0.0.1:54321/storage/v1/object/public/attachments/";

const fakeSigner = async (paths: string[]) =>
  new Map(
    paths
      .filter((path) => !path.startsWith("deals/99/"))
      .map((path) => [path, `https://signed.example/${path}?token=t`]),
  );

describe("bucketPathFromUrl", () => {
  it("reads the bucket path out of a stored public URL, decoding it", () => {
    expect(bucketPathFromUrl(`${PUBLIC}deals/12/0.5.pdf`)).toBe(
      "deals/12/0.5.pdf",
    );
    expect(bucketPathFromUrl(`${PUBLIC}deals/12/cotizaci%C3%B3n.pdf`)).toBe(
      "deals/12/cotización.pdf",
    );
  });

  it("leaves external and empty URLs alone", () => {
    expect(
      bucketPathFromUrl("https://gravatar.com/avatar/abc"),
    ).toBeUndefined();
    expect(bucketPathFromUrl("")).toBeUndefined();
  });
});

describe("signRecordFiles", () => {
  it("signs the bucket files of a note and keeps the external ones", async () => {
    const note = {
      id: 1,
      text: "hola",
      attachments: [
        {
          src: `${PUBLIC}deals/12/0.5.pdf`,
          path: "deals/12/0.5.pdf",
          title: "a",
        },
        { src: "https://drive.example/doc", title: "externo" },
      ],
    };

    const signed = await signRecordFiles(note, ["attachments"], fakeSigner);

    expect(signed.attachments.map((file) => file.src)).toEqual([
      "https://signed.example/deals/12/0.5.pdf?token=t",
      "https://drive.example/doc",
    ]);
    // the stored record is not mutated
    expect(note.attachments[0].src).toBe(`${PUBLIC}deals/12/0.5.pdf`);
  });

  it("signs a single file field from its URL when it has no path, and leaves a refused file as is", async () => {
    const company = {
      id: 1,
      logo: { src: `${PUBLIC}companies/0.7.png`, title: "logo" },
    };
    const foreign = {
      id: 2,
      logo: { src: `${PUBLIC}deals/99/0.8.png`, title: "x" },
    };

    expect((await signRecordFiles(company, ["logo"], fakeSigner)).logo).toEqual(
      {
        src: "https://signed.example/companies/0.7.png?token=t",
        path: "companies/0.7.png",
        title: "logo",
      },
    );
    expect((await signRecordFiles(foreign, ["logo"], fakeSigner)).logo).toEqual(
      foreign.logo,
    );
  });
});

describe("signUrl", () => {
  it("signs a configuration logo stored as a URL string", async () => {
    expect(await signUrl(`${PUBLIC}config/0.9.svg`, fakeSigner)).toBe(
      "https://signed.example/config/0.9.svg?token=t",
    );
    expect(await signUrl("/logos/tekfusion.svg", fakeSigner)).toBe(
      "/logos/tekfusion.svg",
    );
  });
});
