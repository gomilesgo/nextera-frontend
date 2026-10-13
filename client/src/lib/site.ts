export const brand = {
  name: "Nextera",
  parent: "Srahira",
  byline: "a Srahira platform",
  url: "https://nextera.srahira.com",
  parentUrl: "https://srahira.com",
  email: "Contact@srahira.com",
  city: "Hyderabad, Telangana, India",
  positioning:
    "Fixed-return plans from Srahira. Choose a plan, see exactly what it pays each month, and follow every credit in your Nextera portal.",
};

export const publicNav = [
  { href: "/#year", label: "The year" },
  { href: "/#plans", label: "Plans" },
  { href: "/#calculator", label: "Calculator" },
  { href: "/#process", label: "How it works" },
  { href: "/#risks", label: "Risks" },
  { href: "/enquire", label: "Enquire" },
];

/**
 * The landing page carries its own dated index in the instrument bar, so the
 * top bar stays short: the two things a visitor jumps to, and the one ask.
 */
export const headerNav = [
  { href: "/#plans", label: "Plans" },
  { href: "/#calculator", label: "Calculator" },
  { href: "/enquire", label: "Enquire" },
];

export const portalNav = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/plans", label: "Plans" },
  { href: "/portal/investments", label: "Investments" },
  { href: "/portal/wallet", label: "Wallet" },
  { href: "/portal/history", label: "History" },
  { href: "/portal/documents", label: "Documents" },
  { href: "/portal/statements", label: "Statements" },
  { href: "/portal/kyc", label: "KYC" },
  { href: "/portal/bank", label: "Bank" },
  { href: "/portal/support", label: "Support" },
  { href: "/portal/profile", label: "Profile" },
];

export const steps = [
  {
    title: "Choose a plan",
    body: "Every plan shows its annual rate, its tenure, and the smallest and largest amount it accepts. The calculator turns an amount into the monthly credit, the running total, and the date the principal comes back. Compare them before you pay.",
  },
  {
    title: "Verify once",
    body: "Sign in with a one-time code on your mobile number. Then complete KYC with your PAN, name, date of birth and address, and add the bank account that should receive money. We verify that account before the first investment. You do this once.",
  },
  {
    title: "Invest and sign",
    body: "Choose the amount, read the agreement, and accept it with another one-time code. Pay online. When the payment is confirmed, the bond certificate is added to your documents.",
  },
  {
    title: "Receive monthly returns",
    body: "Each due date, the credit is added to your wallet. You can ask to withdraw credited returns. A member of the team approves that request before it is paid to your bank. The principal stays invested until maturity, then it joins the wallet too.",
  },
];

export const disclaimer = [
  "Nextera is operated by Srahira. Plans offered on Nextera are not bank deposits, are not insured by DICGC and are not guaranteed by any government body.",
  "Returns shown by the calculator are illustrative, based on simple interest on the stated annual rate and credited monthly. They are before any tax deducted at source. Actual credits follow your signed agreement.",
  "Principal is returned at maturity and cannot be withdrawn early. Credited returns can be withdrawn at any time subject to verification. Every investment carries risk, including the risk of delayed payment or loss of capital.",
  "Investing requires completed KYC and a verified Indian bank account. Online investing is being introduced in stages and may not yet be available to every customer. Nothing on this site is investment, tax or legal advice; please consult a qualified adviser before investing.",
];
