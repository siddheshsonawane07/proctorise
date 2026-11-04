import { render } from "@testing-library/react";
import { Markdown } from "./Markdown";

describe("Markdown", () => {
  it("renders emphasis", () => {
    const { container } = render(<Markdown>{"Solve **this**"}</Markdown>);
    expect(container.querySelector("strong")?.textContent).toBe("this");
  });

  it("never renders HTML from a prompt", () => {
    const { container } = render(
      <Markdown>{'Hi <img src=x onerror="alert(1)"> <script>alert(2)</script>'}</Markdown>,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("onerror");
  });

  it("drops a Markdown image", () => {
    const { container } = render(<Markdown>{"![x](https://example.test/a.png)"}</Markdown>);
    expect(container.querySelector("img")).toBeNull();
  });

  it("opens links safely", () => {
    const { container } = render(<Markdown>{"[site](https://example.test)"}</Markdown>);
    expect(container.querySelector("a")?.getAttribute("rel")).toContain("noopener");
  });
});
