export interface DocItem {
  label: string
  required: boolean
  category: string
}

export interface MortgageProgram {
  id: string
  name: string
  description: string
  docs: DocItem[]
}

export const MORTGAGE_PROGRAMS: MortgageProgram[] = [
  {
    id: 'conventional',
    name: 'Conventional',
    description: 'Fannie Mae / Freddie Mac — standard conforming loan',
    docs: [
      // Identity
      { label: 'Government-Issued Photo ID', required: true, category: 'Identity' },
      { label: 'Social Security Card or ITIN Letter', required: true, category: 'Identity' },

      // Income — Employed
      { label: 'Pay Stubs (Most Recent 30 Days)', required: true, category: 'Income' },
      { label: 'W-2 Forms (Last 2 Years)', required: true, category: 'Income' },
      { label: 'Federal Tax Returns (Last 2 Years, All Pages)', required: true, category: 'Income' },
      { label: 'Employer Contact Info / HR Letter', required: false, category: 'Income' },

      // Assets
      { label: 'Bank Statements — Checking/Savings (Last 2 Months, All Pages)', required: true, category: 'Assets' },
      { label: 'Retirement/Investment Account Statements (Last 2 Months)', required: false, category: 'Assets' },
      { label: 'Gift Letter (if using gift funds for down payment)', required: false, category: 'Assets' },
      { label: 'Proof of Earnest Money Deposit', required: true, category: 'Assets' },

      // Property
      { label: 'Signed Purchase Agreement / Sales Contract', required: true, category: 'Property' },
      { label: 'Homeowners Insurance Binder / Quote', required: true, category: 'Property' },
      { label: 'Property Survey (if available)', required: false, category: 'Property' },

      // Credit / Liabilities
      { label: 'Mortgage Statements for All Real Estate Owned', required: false, category: 'Liabilities' },
      { label: 'Landlord Contact / 12-Month Rental History Letter', required: false, category: 'Liabilities' },
      { label: 'Bankruptcy Discharge Papers (if applicable)', required: false, category: 'Liabilities' },
    ],
  },
  {
    id: 'fha',
    name: 'FHA',
    description: 'FHA-insured loan — lower down payment, flexible credit',
    docs: [
      { label: 'Government-Issued Photo ID', required: true, category: 'Identity' },
      { label: 'Social Security Card or ITIN Letter', required: true, category: 'Identity' },

      { label: 'Pay Stubs (Most Recent 30 Days)', required: true, category: 'Income' },
      { label: 'W-2 Forms (Last 2 Years)', required: true, category: 'Income' },
      { label: 'Federal Tax Returns (Last 2 Years, All Pages + Schedules)', required: true, category: 'Income' },

      { label: 'Bank Statements (Last 2 Months, All Pages)', required: true, category: 'Assets' },
      { label: 'Gift Letter (FHA allows 100% gift funds)', required: false, category: 'Assets' },
      { label: 'Proof of Earnest Money Deposit', required: true, category: 'Assets' },

      { label: 'Signed Purchase Agreement', required: true, category: 'Property' },
      { label: 'Homeowners Insurance Binder', required: true, category: 'Property' },
      { label: 'FHA Case Number Assignment (from lender)', required: true, category: 'Property' },
      { label: 'Property Appraisal (FHA-approved appraiser)', required: true, category: 'Property' },

      { label: 'Explanation Letter for Any Credit Derogatory', required: false, category: 'Credit' },
      { label: 'Bankruptcy Discharge Papers (if applicable)', required: false, category: 'Credit' },
      { label: 'Foreclosure / Short Sale Documentation (if applicable)', required: false, category: 'Credit' },
      { label: 'Child Support / Alimony Decree (if applicable)', required: false, category: 'Liabilities' },
    ],
  },
  {
    id: 'va',
    name: 'VA',
    description: 'VA loan — for eligible veterans, active duty, surviving spouses',
    docs: [
      { label: 'Government-Issued Photo ID', required: true, category: 'Identity' },
      { label: 'Certificate of Eligibility (COE)', required: true, category: 'Military' },
      { label: 'DD-214 (Certificate of Release / Discharge from Active Duty)', required: true, category: 'Military' },
      { label: 'Statement of Service Letter (if active duty)', required: false, category: 'Military' },

      { label: 'Pay Stubs (Most Recent 30 Days)', required: true, category: 'Income' },
      { label: 'W-2 Forms (Last 2 Years)', required: true, category: 'Income' },
      { label: 'Federal Tax Returns (Last 2 Years)', required: true, category: 'Income' },
      { label: 'VA Disability Award Letter (if applicable)', required: false, category: 'Income' },
      { label: 'Retirement / Pension Award Letter (if applicable)', required: false, category: 'Income' },

      { label: 'Bank Statements (Last 2 Months, All Pages)', required: true, category: 'Assets' },
      { label: 'Proof of Earnest Money Deposit', required: true, category: 'Assets' },

      { label: 'Signed Purchase Agreement', required: true, category: 'Property' },
      { label: 'VA Appraisal (ordered by lender)', required: true, category: 'Property' },
      { label: 'Homeowners Insurance Binder', required: true, category: 'Property' },
      { label: 'Termite / Pest Inspection Report', required: false, category: 'Property' },

      { label: 'Bankruptcy Discharge Papers (if applicable)', required: false, category: 'Credit' },
    ],
  },
  {
    id: 'usda',
    name: 'USDA',
    description: 'USDA Rural Development — 100% financing in eligible rural areas',
    docs: [
      { label: 'Government-Issued Photo ID', required: true, category: 'Identity' },
      { label: 'Social Security Card', required: true, category: 'Identity' },

      { label: 'Pay Stubs (Most Recent 30 Days)', required: true, category: 'Income' },
      { label: 'W-2 Forms (Last 2 Years)', required: true, category: 'Income' },
      { label: 'Federal Tax Returns (Last 2 Years)', required: true, category: 'Income' },
      { label: 'All Household Members Income Documentation', required: true, category: 'Income' },

      { label: 'Bank Statements (Last 2 Months)', required: true, category: 'Assets' },
      { label: 'Proof of Earnest Money Deposit', required: true, category: 'Assets' },

      { label: 'Signed Purchase Agreement', required: true, category: 'Property' },
      { label: 'Proof of Property Eligibility (USDA Eligibility Map)', required: true, category: 'Property' },
      { label: 'Homeowners Insurance Binder', required: true, category: 'Property' },
      { label: 'Well / Septic Inspection (if applicable)', required: false, category: 'Property' },

      { label: 'Explanation Letter for Credit Issues', required: false, category: 'Credit' },
    ],
  },
  {
    id: 'jumbo',
    name: 'Jumbo',
    description: 'Non-conforming loan above conventional loan limits',
    docs: [
      { label: 'Government-Issued Photo ID', required: true, category: 'Identity' },
      { label: 'Social Security Card', required: true, category: 'Identity' },

      { label: 'Pay Stubs (Most Recent 30 Days)', required: true, category: 'Income' },
      { label: 'W-2 Forms (Last 2 Years)', required: true, category: 'Income' },
      { label: 'Federal Tax Returns (Last 2 Years, All Pages + Schedules)', required: true, category: 'Income' },
      { label: 'YTD Profit & Loss Statement (if self-employed)', required: false, category: 'Income' },
      { label: '1099 Forms (Last 2 Years, if applicable)', required: false, category: 'Income' },
      { label: 'Business Tax Returns (Last 2 Years, if self-employed)', required: false, category: 'Income' },
      { label: 'Business License or CPA Letter (if self-employed)', required: false, category: 'Income' },

      { label: 'Bank Statements (Last 3 Months, All Pages)', required: true, category: 'Assets' },
      { label: 'Brokerage / Investment Statements (Last 3 Months)', required: true, category: 'Assets' },
      { label: 'Retirement Account Statements (Last 3 Months)', required: true, category: 'Assets' },
      { label: 'Proof of Reserves (6–12 months PITI)', required: true, category: 'Assets' },
      { label: 'Proof of Earnest Money Deposit', required: true, category: 'Assets' },

      { label: 'Signed Purchase Agreement', required: true, category: 'Property' },
      { label: 'Full Appraisal (may require 2 appraisals)', required: true, category: 'Property' },
      { label: 'Homeowners Insurance Binder', required: true, category: 'Property' },
      { label: 'Title Commitment / Title Search', required: true, category: 'Property' },
      { label: 'HOA Documents (if applicable)', required: false, category: 'Property' },

      { label: 'Existing Mortgage Statements for All Properties', required: true, category: 'Liabilities' },
      { label: 'Real Estate Schedule (all properties owned)', required: true, category: 'Liabilities' },
    ],
  },
  {
    id: 'refinance',
    name: 'Refinance (Rate & Term)',
    description: 'Refinancing existing mortgage for better rate or term',
    docs: [
      { label: 'Government-Issued Photo ID', required: true, category: 'Identity' },
      { label: 'Social Security Card', required: true, category: 'Identity' },

      { label: 'Pay Stubs (Most Recent 30 Days)', required: true, category: 'Income' },
      { label: 'W-2 Forms (Last 2 Years)', required: true, category: 'Income' },
      { label: 'Federal Tax Returns (Last 2 Years)', required: true, category: 'Income' },

      { label: 'Bank Statements (Last 2 Months)', required: true, category: 'Assets' },

      { label: 'Current Mortgage Statement', required: true, category: 'Property' },
      { label: 'Homeowners Insurance Declaration Page', required: true, category: 'Property' },
      { label: 'Most Recent Property Tax Bill', required: true, category: 'Property' },
      { label: 'HOA Statement (if applicable)', required: false, category: 'Property' },
      { label: 'Title Insurance Policy (existing)', required: false, category: 'Property' },
    ],
  },
  {
    id: 'cashout',
    name: 'Cash-Out Refinance',
    description: 'Refinancing to extract equity as cash',
    docs: [
      { label: 'Government-Issued Photo ID', required: true, category: 'Identity' },
      { label: 'Social Security Card', required: true, category: 'Identity' },

      { label: 'Pay Stubs (Most Recent 30 Days)', required: true, category: 'Income' },
      { label: 'W-2 Forms (Last 2 Years)', required: true, category: 'Income' },
      { label: 'Federal Tax Returns (Last 2 Years)', required: true, category: 'Income' },

      { label: 'Bank Statements (Last 2 Months, All Pages)', required: true, category: 'Assets' },
      { label: 'Statement of Purpose for Cash-Out Funds', required: true, category: 'Assets' },

      { label: 'Current Mortgage Statement', required: true, category: 'Property' },
      { label: 'Homeowners Insurance Declaration Page', required: true, category: 'Property' },
      { label: 'Most Recent Property Tax Bill', required: true, category: 'Property' },
      { label: 'Full Property Appraisal', required: true, category: 'Property' },
      { label: 'HOA Statement (if applicable)', required: false, category: 'Property' },

      { label: 'Existing HELOC / Second Mortgage Statement (if applicable)', required: false, category: 'Liabilities' },
    ],
  },
]
