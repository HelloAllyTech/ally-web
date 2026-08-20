export interface CharacterOption {
  value: string;
  label: string;
}

export const GENDER_OPTIONS: CharacterOption[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
];

export const GENDER_IDENTITY_OPTIONS: CharacterOption[] = [
  { value: "agender", label: "Agender" },
  { value: "female-woman", label: "Female/Woman" },
  { value: "genderqueer", label: "Genderqueer" },
  { value: "gender-fluid", label: "Gender Fluid" },
  { value: "gender-non-conforming", label: "Gender Non-Conforming" },
  { value: "intergender", label: "Intergender" },
  { value: "intersex", label: "Intersex" },
  { value: "male-man", label: "Male/Man" },
  { value: "nonbinary", label: "Nonbinary" },
  { value: "other", label: "Other" },
  { value: "transgender", label: "Transgender" },
  { value: "trans-man-male", label: "Trans Man/Male" },
  { value: "trans-woman-female", label: "Trans Woman/Female" },
];

export const SEXUAL_ORIENTATION_OPTIONS: CharacterOption[] = [
  { value: "asexual", label: "Asexual" },
  { value: "bisexual", label: "Bisexual" },
  { value: "gay", label: "Gay" },
  { value: "heterosexual", label: "Heterosexual (straight)" },
  { value: "lesbian", label: "Lesbian" },
  { value: "pansexual", label: "Pansexual" },
  { value: "queer", label: "Queer" },
  { value: "questioning", label: "Questioning" },
];
