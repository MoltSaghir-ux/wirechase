import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

function escXml(val: string | null | undefined): string {
  if (!val) return ''
  return val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const LOAN_TYPE_MAP: Record<string, string> = {
  conventional: 'Conventional', fha: 'FHA', va: 'VA', usda: 'USDAGuaranteed', jumbo: 'Conventional',
}
const LOAN_PURPOSE_MAP: Record<string, string> = {
  purchase: 'Purchase', refinance: 'Refinance', cashout: 'CashOutRefinance', heloc: 'HomeEquityLineOfCredit',
}
const PROPERTY_USE_MAP: Record<string, string> = {
  primary: 'PrimaryResidence', secondary: 'SecondHome', investment: 'Investor',
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const loanId = req.nextUrl.searchParams.get('loanId')
  if (!loanId) return new NextResponse('loanId required', { status: 400 })

  const { data: loan } = await adminSupabase
    .from('loans')
    .select('*, clients(full_name, email, phone)')
    .eq('id', loanId)
    .single()

  if (!loan) return new NextResponse('Not found', { status: 404 })

  const client = loan.clients as { full_name?: string; email?: string; phone?: string } | null
  const nameParts = (client?.full_name ?? '').split(' ')
  const firstName = escXml(nameParts[0] ?? '')
  const lastName = escXml(nameParts.slice(1).join(' ') || (nameParts[0] ?? ''))
  const loanAmount = loan.loan_amount ?? loan.purchase_price ?? 0

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<MESSAGE xmlns="http://www.mismo.org/residential/2009/schemas"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         MISMOVersionIdentifier="3.4">
  <ABOUT_VERSIONS>
    <ABOUT_VERSION>
      <DataVersionIdentifier>${escXml(loan.file_number ?? loan.id)}</DataVersionIdentifier>
      <CreatedDatetime>${new Date().toISOString()}</CreatedDatetime>
      <CreatingSystemName>WireChase</CreatingSystemName>
    </ABOUT_VERSION>
  </ABOUT_VERSIONS>
  <DEAL_SETS>
    <DEAL_SET>
      <DEALS>
        <DEAL>
          <PARTIES>
            <PARTY SequenceNumber="1">
              <ROLES>
                <ROLE>
                  <BORROWER>
                    <BORROWER_DETAIL>
                      <BorrowerClassificationType>Primary</BorrowerClassificationType>
                    </BORROWER_DETAIL>
                  </BORROWER>
                </ROLE>
              </ROLES>
              <TAXPAYER_IDENTIFIERS>
                ${loan.borrower_ssn_last4 ? `<TAXPAYER_IDENTIFIER><TaxpayerIdentifierType>SocialSecurityNumber</TaxpayerIdentifierType><TaxpayerIdentifierValue>XXX-XX-${escXml(loan.borrower_ssn_last4)}</TaxpayerIdentifierValue></TAXPAYER_IDENTIFIER>` : ''}
              </TAXPAYER_IDENTIFIERS>
              <INDIVIDUAL>
                <NAME>
                  <FirstName>${firstName}</FirstName>
                  <LastName>${lastName}</LastName>
                </NAME>
                <CONTACT_POINTS>
                  <CONTACT_POINT>
                    <CONTACT_POINT_EMAIL>
                      <ContactPointEmailValue>${escXml(client?.email)}</ContactPointEmailValue>
                    </CONTACT_POINT_EMAIL>
                  </CONTACT_POINT>
                  ${client?.phone ? `<CONTACT_POINT><CONTACT_POINT_TELEPHONE><ContactPointTelephoneValue>${escXml(client.phone)}</ContactPointTelephoneValue></CONTACT_POINT_TELEPHONE></CONTACT_POINT>` : ''}
                </CONTACT_POINTS>
              </INDIVIDUAL>
            </PARTY>
            ${loan.co_borrower && loan.co_borrower_name ? `
            <PARTY SequenceNumber="2">
              <ROLES><ROLE><BORROWER><BORROWER_DETAIL><BorrowerClassificationType>CoBorrower</BorrowerClassificationType></BORROWER_DETAIL></BORROWER></ROLE></ROLES>
              <INDIVIDUAL>
                <NAME>
                  <FirstName>${escXml(loan.co_borrower_name.split(' ')[0] ?? '')}</FirstName>
                  <LastName>${escXml(loan.co_borrower_name.split(' ').slice(1).join(' ') || loan.co_borrower_name)}</LastName>
                </NAME>
                ${loan.co_borrower_email ? `<CONTACT_POINTS><CONTACT_POINT><CONTACT_POINT_EMAIL><ContactPointEmailValue>${escXml(loan.co_borrower_email)}</ContactPointEmailValue></CONTACT_POINT_EMAIL></CONTACT_POINT></CONTACT_POINTS>` : ''}
              </INDIVIDUAL>
            </PARTY>` : ''}
          </PARTIES>
          <LOANS>
            <LOAN>
              <LOAN_DETAIL>
                <LoanPurposeType>${LOAN_PURPOSE_MAP[loan.loan_purpose] ?? 'Purchase'}</LoanPurposeType>
                <LoanMaturityPeriodCount>360</LoanMaturityPeriodCount>
                <LoanMaturityPeriodType>Month</LoanMaturityPeriodType>
              </LOAN_DETAIL>
              <LOAN_IDENTIFIERS>
                ${loan.file_number ? `<LOAN_IDENTIFIER><LoanIdentifierType>FileNumber</LoanIdentifierType><LoanIdentifierValue>${escXml(loan.file_number)}</LoanIdentifierValue></LOAN_IDENTIFIER>` : ''}
              </LOAN_IDENTIFIERS>
              <TERMS_OF_LOAN>
                <BaseLoanAmount>${loanAmount}</BaseLoanAmount>
                <LoanPurposeType>${LOAN_PURPOSE_MAP[loan.loan_purpose] ?? 'Purchase'}</LoanPurposeType>
                <MortgageType>${LOAN_TYPE_MAP[loan.loan_type] ?? 'Conventional'}</MortgageType>
              </TERMS_OF_LOAN>
              ${loan.closing_date ? `<CLOSING><ClosingDatetime>${loan.closing_date}T00:00:00</ClosingDatetime></CLOSING>` : ''}
              ${loan.rate_lock_expiry ? `<LOCK_INFORMATION><LockExpirationDatetime>${loan.rate_lock_expiry}T00:00:00</LockExpirationDatetime></LOCK_INFORMATION>` : ''}
            </LOAN>
          </LOANS>
          <COLLATERALS>
            <COLLATERAL>
              <SUBJECT_PROPERTY>
                <ADDRESS>
                  <AddressLineText>${escXml(loan.property_address)}</AddressLineText>
                  <CityName>${escXml(loan.property_county ?? '')}</CityName>
                  <StateCode>${escXml(loan.property_state ?? '')}</StateCode>
                  <PostalCode>${escXml(loan.property_zip ?? '')}</PostalCode>
                  <CountryCode>US</CountryCode>
                </ADDRESS>
                <PROPERTY_DETAIL>
                  <PropertyEstimatedValueAmount>${loan.purchase_price ?? 0}</PropertyEstimatedValueAmount>
                  <PropertyUsageType>${PROPERTY_USE_MAP[loan.property_use] ?? 'PrimaryResidence'}</PropertyUsageType>
                </PROPERTY_DETAIL>
                <PROPERTY_IDENTIFIERS>
                  ${loan.property_apn ? `<PROPERTY_IDENTIFIER><PropertyIdentifierType>AssessorParcelNumber</PropertyIdentifierType><PropertyIdentifierValue>${escXml(loan.property_apn)}</PropertyIdentifierValue></PROPERTY_IDENTIFIER>` : ''}
                </PROPERTY_IDENTIFIERS>
              </SUBJECT_PROPERTY>
            </COLLATERAL>
          </COLLATERALS>
        </DEAL>
      </DEALS>
    </DEAL_SET>
  </DEAL_SETS>
</MESSAGE>`

  const filename = `WireChase_${loan.file_number ?? loan.id}_MISMO34.xml`
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
