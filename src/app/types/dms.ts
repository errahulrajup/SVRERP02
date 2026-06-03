// ── DMS — Shared TypeScript Types ────────────────────────────────────────────

export type DocStatus = 'draft' | 'pending_approval' | 'approved' | 'issued' | 'rejected' | 'cancelled' | 'archived';

export type DocTypeCode =
  | 'BL'   // Business Letter
  | 'PO'   // Purchase Order
  | 'INV'  // Invoice / Bill
  | 'AGR'  // Agreement / Contract
  | 'NTC'  // Notice
  | 'QT'   // Quotation
  | 'APT'  // Appointment Letter
  | 'EXP'  // Experience Letter
  | 'NOC'  // NOC
  | 'OTH'; // Other

export const DOC_TYPE_LABELS: Record<DocTypeCode, string> = {
  BL: 'Business Letter',
  PO: 'Purchase Order',
  INV: 'Invoice / Bill',
  AGR: 'Agreement / Contract',
  NTC: 'Notice',
  QT: 'Quotation',
  APT: 'Appointment Letter',
  EXP: 'Experience Letter',
  NOC: 'NOC',
  OTH: 'Other',
};

export interface DmsDocument {
  id: string;
  co_id: string | null;
  date: string | null;
  type_code: DocTypeCode;
  type: string;
  priority: 'Normal' | 'Urgent' | 'Confidential' | 'For Immediate Action';
  ref_no: string | null;
  to_name: string;
  to_company: string | null;
  to_address: string | null;
  to_city: string | null;
  salutation: string;
  subject: string;
  content: string;
  closing: string | null;
  issued_by: string;
  designation: string | null;
  status: DocStatus;
  version: number;
  parent_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface DmsLink {
  id: string;
  document_id: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

export interface DmsAccessLog {
  id: string;
  document_id: string;
  user_id: string | null;
  action: string;
  ip_address: string | null;
  created_at: string;
}

export interface DmsCompany {
  id: string;
  name: string;
  prefix: string;
  addr1: string | null;
  addr2: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  gst: string | null;
  verify_url: string | null;
  year: string;
  color1: string;
  color2: string;
  footer_text: string | null;
  watermark_text: string | null;
  watermark_on: boolean;
  qr_on: boolean;
  logo: string | null;       // base64 or URL
  signature: string | null;  // base64 or URL
  default_signatory: string | null;
  default_designation: string | null;
  created_at: string;
}

export interface DmsDocumentStats {
  total: number;
  issued: number;
  draft: number;
  cancelled: number;
}

export interface DmsTemplate {
  id: string;
  icon: string;
  name: string;
  description: string;
  type_code: DocTypeCode;
  subject: string;
  salutation: string;
  content: string;
  closing: string;
}

// Built-in document templates
export const DMS_TEMPLATES: DmsTemplate[] = [
  {
    id: 'apt',
    icon: '👔',
    name: 'Appointment Letter',
    description: 'Formal employee appointment',
    type_code: 'APT',
    subject: 'Appointment Letter',
    salutation: 'Dear Sir,',
    content: `We are pleased to inform you that you have been selected for the position of [Designation] at Srivriddhi Enterprise, Sagar, M.P.\n\nYour appointment is effective from [Date]. Your compensation, terms, and responsibilities will be as per the discussion and the attached terms of employment.\n\nWe look forward to your contribution to the growth of our organization.\n\nKindly sign and return a copy of this letter as your acceptance.`,
    closing: 'Thanking you,',
  },
  {
    id: 'exp',
    icon: '📜',
    name: 'Experience Letter',
    description: 'Service/experience certificate',
    type_code: 'EXP',
    subject: 'Experience Certificate',
    salutation: 'To Whomsoever It May Concern,',
    content: `This is to certify that [Employee Name] was employed with Srivriddhi Enterprise from [Start Date] to [End Date] in the capacity of [Designation].\n\nDuring the period of employment, [he/she] performed [his/her] duties with sincerity and dedication. [He/She] is a person of good character and conduct.\n\nWe wish [him/her] all the best in [his/her] future endeavours.`,
    closing: 'Yours faithfully,',
  },
  {
    id: 'noc',
    icon: '✅',
    name: 'No Objection Certificate',
    description: 'NOC for any purpose',
    type_code: 'NOC',
    subject: 'No Objection Certificate',
    salutation: 'To Whomsoever It May Concern,',
    content: `This is to certify that Srivriddhi Enterprise has no objection to [Name] for [Purpose].\n\nThe above is being issued upon the request of the concerned person for the purpose stated therein. This certificate shall be valid for [Duration].`,
    closing: 'Yours faithfully,',
  },
  {
    id: 'notice',
    icon: '📢',
    name: 'Official Notice',
    description: 'Circular / formal notice',
    type_code: 'NTC',
    subject: 'Official Notice',
    salutation: 'Dear Sir / Madam,',
    content: `This is to bring to your kind notice that [Content of the notice].\n\nAll concerned are hereby informed to take note and act accordingly. Any queries regarding this notice may be directed to the undersigned.`,
    closing: 'Thanking you,',
  },
  {
    id: 'quotation',
    icon: '💰',
    name: 'Quotation',
    description: 'Price quotation / estimate',
    type_code: 'QT',
    subject: 'Quotation for [Product/Service]',
    salutation: 'Dear Sir / Madam,',
    content: `Thank you for your inquiry. We are pleased to submit our quotation as follows:\n\n[Item Description]:\n  Unit Price: ₹[Amount]\n  Quantity: [Qty]\n  Total: ₹[Total]\n\nGST @ [Rate]%: ₹[GST Amount]\nGrand Total: ₹[Grand Total]\n\nThis quotation is valid for 30 days from the date of issue. Delivery within [X] days of order confirmation.`,
    closing: 'Thanking you,',
  },
  {
    id: 'bl',
    icon: '📝',
    name: 'Business Letter',
    description: 'General business correspondence',
    type_code: 'BL',
    subject: 'Business Communication',
    salutation: 'Dear Sir / Madam,',
    content: `We are writing to you regarding [Subject matter].\n\n[Main content of the letter]\n\nWe trust you will give this matter your prompt attention and look forward to your positive response.`,
    closing: 'Thanking you,',
  },
];
