import { describe, expect, it } from "vitest";
import { onboardingSteps, progress } from "./onboarding";

describe("primeiros passos", () => {
  it("marca o que os registros comprovam", () => {
    const s = onboardingSteps({
      farmFilled: true,
      settingsFilled: false,
      pens: 3,
      sows: 0,
      members: 1,
      breedings: 0,
    });
    expect(s.filter((x) => x.done).map((x) => x.id)).toEqual(["granja", "baias"]);
    expect(progress(s)).toEqual({ done: 2, total: 6, pct: 33 });
  });
  it("equipe só conta com mais de uma pessoa", () => {
    expect(
      onboardingSteps({
        farmFilled: false,
        settingsFilled: false,
        pens: 0,
        sows: 0,
        members: 2,
        breedings: 0,
      }).find((x) => x.id === "equipe")!.done,
    ).toBe(true);
  });
});
