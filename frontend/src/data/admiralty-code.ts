// https://en.wikipedia.org/wiki/Admiralty_code

interface CodeDescription {
  title: string;
  description: string;
}

export const reliabilityScale: Record<string, CodeDescription> = {
  A: {
    title: "Completely reliable",
    description:
      "No doubt of authenticity, trustworthiness, or competency; has a history of complete reliability",
  },
  B: {
    title: "Usually reliable",
    description:
      "Minor doubt about authenticity, trustworthiness, or competency; has a history of valid information most of the time",
  },
  C: {
    title: "Fairly reliable",
    description:
      "Doubt of authenticity, trustworthiness, or competency but has provided valid information in the past",
  },
  D: {
    title: "Not usually reliable",
    description:
      "Significant doubt about authenticity, trustworthiness, or competency but has provided valid information in the past",
  },
  E: {
    title: "Unreliable",
    description: "Lacking in authenticity, trustworthiness, and competency; history of invalid information",
  },
  F: {
    title: "Reliability cannot be judged",
    description: "No basis exists for evaluating the reliability of the source",
  },
} as const;

export const credibilityScale: Record<string, CodeDescription> = {
  1: {
    title: "Confirmed by other sources",
    description:
      "Confirmed by other independent sources; logical in itself; Consistent with other information on the subject",
  },
  2: {
    title: "Probably True",
    description: "Not confirmed; logical in itself; consistent with other information on the subject",
  },
  3: {
    title: "Possibly True",
    description:
      "Not confirmed; reasonably logical in itself; agrees with some other information on the subject",
  },
  4: {
    title: "Doubtful",
    description: "Not confirmed; possible but not logical; no other information on the subject",
  },
  5: {
    title: "Improbable",
    description: "Not confirmed; not logical in itself; contradicted by other information on the subject",
  },
  6: {
    title: "Truth cannot be judged",
    description: "No basis exists for evaluating the validity of the information",
  },
} as const;
