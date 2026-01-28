import { metadata } from "@/app/layout"

describe("SEO Metadata", () => {
  it("has a title with default and template", () => {
    expect(metadata.title).toEqual({
      default: "SHaiPT - AI Personal Training",
      template: "%s | SHaiPT",
    })
  })

  it("has a description", () => {
    expect(metadata.description).toBeTruthy()
    expect(typeof metadata.description).toBe("string")
    expect((metadata.description as string).length).toBeGreaterThan(50)
  })

  it("has keywords", () => {
    expect(metadata.keywords).toBeTruthy()
    expect(Array.isArray(metadata.keywords)).toBe(true)
    expect((metadata.keywords as string[]).length).toBeGreaterThan(3)
  })

  it("has Open Graph metadata", () => {
    expect(metadata.openGraph).toBeTruthy()
    const og = metadata.openGraph as Record<string, unknown>
    expect(og.type).toBe("website")
    expect(og.title).toBeTruthy()
    expect(og.description).toBeTruthy()
    expect(og.siteName).toBe("SHaiPT")
  })

  it("has Twitter card metadata", () => {
    expect(metadata.twitter).toBeTruthy()
    const twitter = metadata.twitter as Record<string, unknown>
    expect(twitter.card).toBe("summary_large_image")
    expect(twitter.title).toBeTruthy()
    expect(twitter.description).toBeTruthy()
  })

  it("has robots configuration", () => {
    expect(metadata.robots).toBeTruthy()
    const robots = metadata.robots as Record<string, unknown>
    expect(robots.index).toBe(true)
    expect(robots.follow).toBe(true)
  })

  it("has icon configuration", () => {
    expect(metadata.icons).toBeTruthy()
    const icons = metadata.icons as Record<string, unknown>
    expect(icons.icon).toBeTruthy()
    expect(icons.apple).toBeTruthy()
  })

  it("has a metadataBase URL", () => {
    expect(metadata.metadataBase).toBeInstanceOf(URL)
  })
})
