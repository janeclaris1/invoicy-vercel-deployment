import React, { useState } from "react";
import {
  Shield,
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const DISCLAIMER =
  "These templates are for reference only. They are not legal advice. Have all documents reviewed by a qualified lawyer before use, especially for compliance with the Labour Act, 2003 (Act 651) and local regulations.";

const TEMPLATES = [
  {
    id: "employment-contract",
    title: "Employment Contract",
    description: "Written statement of employment particulars (Act 651). Use for new hires.",
    category: "Contracts",
    content: `EMPLOYMENT CONTRACT

Between: [Company Name] ("Employer") and [Employee Full Name] ("Employee")

1. POSITION & START DATE
   - Job title: [Title]
   - Department: [Department]
   - Start date: [Date]
   - Place of work: [Address]

2. HOURS OF WORK
   - Normal working hours: [e.g. 40 hours per week, Monday–Friday]
   - Overtime: As per Labour Act, 2003 (Act 651) and company policy.

3. REMUNERATION
   - Basic salary: [Amount] [GHS] per [month/week], paid on [date].
   - Other benefits: [List any allowances, bonuses, or benefits.]

4. LEAVE (Act 651)
   - Annual leave: As per Act 651 (based on continuous service).
   - Sick leave: As per company policy and Act 651.
   - Maternity leave: 12 weeks as per law (where applicable).

5. NOTICE OF TERMINATION (Act 651)
   - 3+ years service: 1 month's notice in writing.
   - Under 3 years: 2 weeks' notice in writing.
   - Payment in lieu of notice may be agreed.

6. CONFIDENTIALITY & CONDUCT
   - Employee agrees to maintain confidentiality of employer's business and to comply with company policies and the Code of Conduct.

7. OTHER TERMS
   - [Any probation period, non-compete, or other terms as legally permitted.]

Signed:
Employer: _________________ Date: _______
Employee: _________________ Date: _______

(Have this document reviewed by a lawyer before use.)`,
  },
  {
    id: "code-of-conduct",
    title: "Code of Conduct / Workplace Policy",
    description: "Expected behaviour, ethics, and disciplinary process.",
    category: "Policies",
    content: `CODE OF CONDUCT & WORKPLACE POLICY

1. PURPOSE
   This policy sets out expected standards of behaviour for all employees and supports fair treatment and compliance with the Labour Act, 2003 (Act 651).

2. STANDARDS OF CONDUCT
   - Treat colleagues, clients, and visitors with respect and dignity.
   - No harassment, discrimination, or violence.
   - Honesty and integrity in all work and reporting.
   - Protect company and client confidential information.
   - Use company resources only for legitimate business purposes.
   - Comply with all applicable laws and company policies.

3. ATTENDANCE & PUNCTUALITY
   - Report on time; notify supervisor in advance when absent or late.
   - Follow leave and sick-leave procedures.

4. DISCIPLINARY PROCESS
   - Minor breaches: Verbal or written warning, and corrective action.
   - Serious or repeated breaches: Written warning, suspension (where provided for), or termination in line with Act 651.
   - Gross misconduct may result in summary termination where permitted by law.
   - Employee has the right to be heard before any disciplinary action.

5. GRIEVANCES
   - Employees may raise grievances through [HR / designated person]. Complaints will be handled fairly and in confidence where possible.

6. ACKNOWLEDGMENT
   I have read and agree to abide by this Code of Conduct.

   Name: _________________ Date: _______`,
  },
  {
    id: "leave-policy",
    title: "Leave Policy",
    description: "Annual, sick, maternity/paternity, and other leave (aligned with Act 651).",
    category: "Policies",
    content: `LEAVE POLICY

(This policy should be read with the Labour Act, 2003 (Act 651). Leave cannot be forfeited by agreement.)

1. ANNUAL LEAVE
   - Entitlement: As per Act 651, based on continuous service.
   - Request: Submit to [supervisor/HR] in advance where possible.
   - Unused leave: Carried over or paid out as per policy and law.

2. SICK LEAVE
   - Entitlement: [X days] per year with pay; additional unpaid or as per policy. Medical certificate may be required for absences over [X] days.
   - Notice: Inform [supervisor/HR] as soon as practicable.

3. MATERNITY LEAVE
   - 12 weeks as per the law. Notice and documentation as required.

4. PATERNITY LEAVE
   - [X days] as per company policy and any applicable law.

5. BEREAVEMENT / COMPASSIONATE LEAVE
   - [X days] for immediate family, as per company policy.

6. PUBLIC HOLIDAYS
   - As declared by the Republic of Ghana.

7. RECORDS
   - Leave taken will be recorded in personnel/HR files.

(Have this policy reviewed by a lawyer.)`,
  },
  {
    id: "termination-resignation",
    title: "Termination / Resignation Acknowledgment",
    description: "Written notice and acknowledgment for ending employment (Act 651).",
    category: "Forms",
    content: `TERMINATION / RESIGNATION ACKNOWLEDGMENT

Labour Act, 2003 (Act 651) requires written notice specifying reason and date. Use this form to record the end of employment.

EMPLOYEE: [Full Name]
EMPLOYEE ID: [ID]
POSITION: [Title]
DEPARTMENT: [Department]

TYPE: [ ] Resignation by employee  [ ] Termination by employer  [ ] End of fixed-term  [ ] Redundancy  [ ] Other: _______

NOTICE DETAILS
- Notice given on: [Date]
- Last working day: [Date]
- Reason (if termination by employer): _________________

ACT 651 NOTICE PERIOD
- Contract 3+ years: 1 month | Under 3 years: 2 weeks | Other: _______
- [ ] Notice period served  [ ] Payment in lieu of notice

HANDOVER
- Company property returned: [ ] Laptop  [ ] Keys  [ ] ID  [ ] Other: _______
- Final pay and any entitlements (leave, etc.) as per policy and law.

ACKNOWLEDGMENT
I acknowledge that my employment with [Company Name] ends on [Date] and that I have received/ will receive my final dues as agreed.

Employee signature: _________________ Date: _______
Employer/HR signature: _________________ Date: _______

(Use with legal advice.)`,
  },
  {
    id: "confidentiality-nda",
    title: "Confidentiality / NDA",
    description: "Confidentiality and non-disclosure for employees and contractors.",
    category: "Contracts",
    content: `CONFIDENTIALITY & NON-DISCLOSURE AGREEMENT

Between: [Company Name] and [Employee/Contractor Name]

1. CONFIDENTIAL INFORMATION
   "Confidential Information" means any non-public information disclosed by the Company (or to which the undersigned has access) including but not limited to: business plans, financial data, customer lists, processes, software, and trade secrets.

2. OBLIGATIONS
   - Not to disclose Confidential Information to any third party without written consent.
   - To use Confidential Information only for the purpose of performing duties for the Company.
   - To protect Confidential Information with the same care used for own confidential information, and at least reasonable care.
   - To return or destroy all Confidential Information upon end of employment/engagement.

3. EXCEPTIONS
   - Information that is or becomes publicly available (other than by breach).
   - Information lawfully received from a third party without restriction.
   - Information required to be disclosed by law (with notice to the Company where permitted).

4. DURATION
   - Obligations survive the end of employment/engagement for [X] years for [trade secrets / all CI as defined in policy].

5. REMEDIES
   - Breach may cause irreparable harm; the Company may seek injunctive relief and damages.

Signed:
Company: _________________ Date: _______
Employee/Contractor: _________________ Date: _______

(Have reviewed by a lawyer.)`,
  },
  {
    id: "health-safety",
    title: "Health & Safety Policy",
    description: "Basic workplace health and safety commitment and responsibilities.",
    category: "Policies",
    content: `HEALTH & SAFETY POLICY

1. COMMITMENT
   [Company Name] is committed to providing a safe and healthy workplace and to complying with applicable health and safety laws and regulations.

2. RESPONSIBILITIES
   - Management: Provide safe premises, equipment, and systems; training; and oversight.
   - Employees: Follow safety rules, use PPE where required, report hazards and incidents, and cooperate with safety measures.

3. HAZARD REPORTING
   - All employees must report hazards, near-misses, and injuries to [HR/Safety Officer] without delay.

4. FIRST AID & EMERGENCY
   - First-aid kit location: [Location]. Emergency contacts: [List]. Evacuation procedure: [Brief description or reference to poster].

5. WORKPLACE INSPECTIONS
   - Regular checks will be carried out; findings will be addressed in a timely manner.

6. TRAINING
   - New employees will receive health and safety induction. Refresher training as needed.

7. REVIEW
   - This policy will be reviewed periodically and updated as required.

Date adopted: _______
(Align with local OHS regulations.)`,
  },
  {
    id: "data-protection",
    title: "Employee Data Protection Notice",
    description: "How employee personal data is collected, used, and protected.",
    category: "Policies",
    content: `EMPLOYEE DATA PROTECTION NOTICE

1. WHO WE ARE
   [Company Name] is the data controller for the personal data we hold about you as an employee or former employee.

2. DATA WE COLLECT
   - Identity and contact details; employment history; pay and benefits; attendance; performance; health (where relevant and lawful); and other data necessary for the employment relationship and legal compliance.

3. PURPOSES & LEGAL BASIS
   - Managing the employment contract, payroll, leave, performance, and discipline.
   - Legal compliance (e.g. tax, labour law).
   - Legitimate interests (e.g. security, business administration) where applicable.

4. WHO WE SHARE WITH
   - HR, management, and authorised personnel; payroll/tax authorities; benefits providers; and others where required by law or with your consent.

5. RETENTION
   - We keep your data for as long as necessary for employment, law, and legitimate purposes. Retention periods are defined in our data retention policy.

6. YOUR RIGHTS
   - Where applicable under law: access, correction, restriction, objection, and complaint to the relevant data protection authority.

7. SECURITY
   - We use appropriate technical and organisational measures to protect your personal data.

8. CONTACT
   Questions: [HR contact / DPO if applicable].

(Align with Data Protection Act, 2012 (Act 843) and any updates.)`,
  },
];

const TemplateCard = ({ template, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(template.content);
    setCopied(true);
    toast.success("Template copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <FileText className="w-5 h-5 text-blue-700 dark:text-blue-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-white">
              {template.title}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-300">
              {template.category}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-0.5 truncate">
            {template.description}
          </p>
        </div>
        {open ? (
          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="border-t border-gray-200 dark:border-slate-700 px-4 py-4 bg-gray-50/50 dark:bg-slate-800/30">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-300 font-sans max-h-96 overflow-y-auto rounded-lg p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
            {template.content}
          </pre>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800 transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied" : "Copy template"}
          </button>
        </div>
      )}
    </div>
  );
};

const HrCompliance = () => {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-700 dark:text-blue-400" />
          Legal & Compliance Templates
        </h1>
        <p className="text-gray-600 dark:text-slate-400">
          HR document templates to support legal compliance. Customise with your company details and have them reviewed by a qualified lawyer before use.
        </p>
      </div>

      <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-200">{DISCLAIMER}</p>
      </div>

      <div className="space-y-4">
        {TEMPLATES.map((template, index) => (
          <TemplateCard key={template.id} template={template} defaultOpen={index === 0} />
        ))}
      </div>
    </div>
  );
};

export default HrCompliance;
