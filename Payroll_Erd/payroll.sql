
-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 1: LOOKUP / LIBRARY TABLES  (Reference Data)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE lib_countries
(
  country_id   SERIAL PRIMARY KEY,
  country_code CHAR(3)      NOT NULL UNIQUE,   -- ISO 3166-1 alpha-3
  country_name VARCHAR(100) NOT NULL
);

CREATE TABLE lib_regions
(
  region_id   SERIAL PRIMARY KEY,
  country_id  INT          NOT NULL,
  region_name VARCHAR(100) NOT NULL,
  CONSTRAINT fk_regions_country FOREIGN KEY (country_id) REFERENCES lib_countries(country_id)
);

CREATE TABLE lib_provinces
(
  province_id   SERIAL PRIMARY KEY,
  region_id     INT          NOT NULL,
  province_name VARCHAR(100) NOT NULL,
  CONSTRAINT fk_provinces_region FOREIGN KEY (region_id) REFERENCES lib_regions(region_id)
);

CREATE TABLE lib_cities
(
  city_id     SERIAL PRIMARY KEY,
  province_id INT          NOT NULL,
  city_name   VARCHAR(100) NOT NULL,
  zip_code    VARCHAR(10),
  CONSTRAINT fk_cities_province FOREIGN KEY (province_id) REFERENCES lib_provinces(province_id)
);

CREATE TABLE lib_departments
(
  department_id   SERIAL PRIMARY KEY,
  department_code VARCHAR(10)  NOT NULL UNIQUE,
  department_name VARCHAR(100) NOT NULL,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE lib_positions
(
  position_id    SERIAL PRIMARY KEY,
  department_id  INT          NOT NULL,
  position_code  VARCHAR(10)  NOT NULL UNIQUE,
  position_title VARCHAR(100) NOT NULL,
  pay_grade      VARCHAR(10),
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_positions_department FOREIGN KEY (department_id) REFERENCES lib_departments(department_id)
);

CREATE TABLE lib_employment_types
(
  employment_type_id SERIAL PRIMARY KEY,
  type_code          VARCHAR(20)  NOT NULL UNIQUE,  -- FULL_TIME, PART_TIME, CONTRACT, INTERN
  type_name          VARCHAR(50)  NOT NULL
);

CREATE TABLE lib_employment_statuses
(
  status_id   SERIAL PRIMARY KEY,
  status_code VARCHAR(20) NOT NULL UNIQUE,  -- ACTIVE, RESIGNED, TERMINATED, ON_LEAVE, RETIRED
  status_name VARCHAR(50) NOT NULL
);

CREATE TABLE lib_tax_brackets
(
  bracket_id       SERIAL PRIMARY KEY,
  country_id       INT            NOT NULL,
  bracket_label    VARCHAR(50)    NOT NULL,
  min_income       NUMERIC(15,2)  NOT NULL,
  max_income       NUMERIC(15,2),               -- NULL = no upper bound
  tax_rate_pct     NUMERIC(5,4)   NOT NULL,      -- e.g. 0.2000 = 20%
  effective_from   DATE           NOT NULL,
  effective_to     DATE,
  CONSTRAINT fk_tax_country FOREIGN KEY (country_id) REFERENCES lib_countries(country_id)
);

CREATE TABLE lib_benefit_types
(
  benefit_type_id SERIAL PRIMARY KEY,
  type_code       VARCHAR(30)  NOT NULL UNIQUE,   -- HEALTH, DENTAL, SSS, PAGIBIG, PHILHEALTH, 401K, etc.
  type_name       VARCHAR(100) NOT NULL,
  is_mandatory    BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE TABLE lib_deduction_types
(
  deduction_type_id SERIAL PRIMARY KEY,
  type_code         VARCHAR(30)  NOT NULL UNIQUE,  -- TAX, SSS, PAGIBIG, PHILHEALTH, LOAN, UNION_DUES
  type_name         VARCHAR(100) NOT NULL,
  is_statutory      BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE TABLE lib_earning_types
(
  earning_type_id SERIAL PRIMARY KEY,
  type_code       VARCHAR(30)  NOT NULL UNIQUE,  -- BASIC, OVERTIME, HOLIDAY, NIGHT_DIFF, ALLOWANCE, BONUS, COMMISSION
  type_name       VARCHAR(100) NOT NULL,
  is_taxable      BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE lib_leave_types
(
  leave_type_id SERIAL PRIMARY KEY,
  type_code     VARCHAR(30)  NOT NULL UNIQUE,  -- VACATION, SICK, MATERNITY, PATERNITY, EMERGENCY, BEREAVEMENT
  type_name     VARCHAR(100) NOT NULL,
  is_paid       BOOLEAN      NOT NULL DEFAULT TRUE,
  max_days      INT
);

CREATE TABLE lib_pay_frequencies
(
  frequency_id   SERIAL PRIMARY KEY,
  frequency_code VARCHAR(20)  NOT NULL UNIQUE,  -- WEEKLY, BI_WEEKLY, SEMI_MONTHLY, MONTHLY
  frequency_name VARCHAR(50)  NOT NULL,
  periods_per_year INT        NOT NULL           -- 52, 26, 24, 12
);

CREATE TABLE lib_banks
(
  bank_id   SERIAL PRIMARY KEY,
  bank_code VARCHAR(20)  NOT NULL UNIQUE,
  bank_name VARCHAR(100) NOT NULL,
  swift_bic VARCHAR(11)
);

CREATE TABLE lib_currencies
(
  currency_id   SERIAL PRIMARY KEY,
  currency_code CHAR(3)     NOT NULL UNIQUE,  -- ISO 4217
  currency_name VARCHAR(50) NOT NULL,
  symbol        VARCHAR(5)
);

CREATE TABLE lib_shift_types
(
  shift_type_id SERIAL PRIMARY KEY,
  shift_code    VARCHAR(20)  NOT NULL UNIQUE,   -- DAY, NIGHT, GRAVEYARD, ROTATING
  shift_name    VARCHAR(50)  NOT NULL,
  start_time    TIME         NOT NULL,
  end_time      TIME         NOT NULL,
  night_diff    BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE TABLE lib_holiday_types
(
  holiday_type_id SERIAL PRIMARY KEY,
  type_code       VARCHAR(30)  NOT NULL UNIQUE,  -- REGULAR, SPECIAL_NON_WORKING, DOUBLE
  type_name       VARCHAR(50)  NOT NULL,
  pay_multiplier  NUMERIC(3,2) NOT NULL DEFAULT 1.00
);

-- ────────────────────────────────────────────────────────────────────────────
-- SECTION 2: CORE ENTITY TABLES  (Transactional / Write Model)
-- ────────────────────────────────────────────────────────────────────────────

-- 2A. ORGANIZATION HIERARCHY

CREATE TABLE organizations
(
  org_id       SERIAL PRIMARY KEY,
  org_name     VARCHAR(150) NOT NULL,
  tax_id_num   VARCHAR(30),                     -- Company TIN
  country_id   INT          NOT NULL,
  currency_id  INT          NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ,
  CONSTRAINT fk_org_country  FOREIGN KEY (country_id)  REFERENCES lib_countries(country_id),
  CONSTRAINT fk_org_currency FOREIGN KEY (currency_id) REFERENCES lib_currencies(currency_id)
);

CREATE TABLE org_branches
(
  branch_id    SERIAL PRIMARY KEY,
  org_id       INT          NOT NULL,
  branch_code  VARCHAR(20)  NOT NULL,
  branch_name  VARCHAR(100) NOT NULL,
  city_id      INT,
  address_line TEXT,
  is_hq        BOOLEAN      NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_branch_org  FOREIGN KEY (org_id)  REFERENCES organizations(org_id),
  CONSTRAINT fk_branch_city FOREIGN KEY (city_id) REFERENCES lib_cities(city_id)
);

-- 2B. EMPLOYEE MASTER

CREATE TABLE employees
(
  employee_id       SERIAL PRIMARY KEY,
  org_id            INT          NOT NULL,
  employee_code     VARCHAR(20)  NOT NULL UNIQUE,
  first_name        VARCHAR(80)  NOT NULL,
  middle_name       VARCHAR(80),
  last_name         VARCHAR(80)  NOT NULL,
  suffix            VARCHAR(10),
  date_of_birth     DATE         NOT NULL,
  gender            VARCHAR(10),
  marital_status    VARCHAR(20),
  nationality       VARCHAR(50),
  tax_id            VARCHAR(30),                    -- Personal TIN
  sss_number        VARCHAR(20),
  philhealth_number VARCHAR(20),
  pagibig_number    VARCHAR(20),
  contact_phone     VARCHAR(20),
  contact_email     VARCHAR(150),
  avatar_url        TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ,
  CONSTRAINT fk_emp_org FOREIGN KEY (org_id) REFERENCES organizations(org_id)
);

CREATE TABLE employee_addresses
(
  address_id     SERIAL PRIMARY KEY,
  employee_id    INT          NOT NULL,
  address_type   VARCHAR(20)  NOT NULL DEFAULT 'PRIMARY',  -- PRIMARY, SECONDARY, EMERGENCY
  address_line_1 TEXT         NOT NULL,
  address_line_2 TEXT,
  city_id        INT,
  postal_code    VARCHAR(10),
  is_current     BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_addr_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
  CONSTRAINT fk_addr_city     FOREIGN KEY (city_id)     REFERENCES lib_cities(city_id)
);

CREATE TABLE employee_employment
(
  employment_id       SERIAL PRIMARY KEY,
  employee_id         INT           NOT NULL,
  branch_id           INT,
  position_id         INT           NOT NULL,
  employment_type_id  INT           NOT NULL,
  status_id           INT           NOT NULL,
  pay_frequency_id    INT           NOT NULL,
  shift_type_id       INT,
  hire_date           DATE          NOT NULL,
  regularization_date DATE,
  separation_date     DATE,
  base_salary         NUMERIC(15,2) NOT NULL,
  currency_id         INT           NOT NULL,
  is_current          BOOLEAN       NOT NULL DEFAULT TRUE,
  effective_from      DATE          NOT NULL,
  effective_to        DATE,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_ee_employee   FOREIGN KEY (employee_id)      REFERENCES employees(employee_id),
  CONSTRAINT fk_ee_branch     FOREIGN KEY (branch_id)        REFERENCES org_branches(branch_id),
  CONSTRAINT fk_ee_position   FOREIGN KEY (position_id)      REFERENCES lib_positions(position_id),
  CONSTRAINT fk_ee_type       FOREIGN KEY (employment_type_id) REFERENCES lib_employment_types(employment_type_id),
  CONSTRAINT fk_ee_status     FOREIGN KEY (status_id)        REFERENCES lib_employment_statuses(status_id),
  CONSTRAINT fk_ee_freq       FOREIGN KEY (pay_frequency_id) REFERENCES lib_pay_frequencies(frequency_id),
  CONSTRAINT fk_ee_shift      FOREIGN KEY (shift_type_id)    REFERENCES lib_shift_types(shift_type_id),
  CONSTRAINT fk_ee_currency   FOREIGN KEY (currency_id)      REFERENCES lib_currencies(currency_id)
);

CREATE TABLE employee_bank_accounts
(
  bank_account_id SERIAL PRIMARY KEY,
  employee_id     INT         NOT NULL,
  bank_id         INT         NOT NULL,
  account_number  VARCHAR(30) NOT NULL,
  account_type    VARCHAR(20) NOT NULL DEFAULT 'SAVINGS',  -- SAVINGS, CHECKING
  is_primary      BOOLEAN     NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_ba_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
  CONSTRAINT fk_ba_bank     FOREIGN KEY (bank_id)     REFERENCES lib_banks(bank_id)
);

CREATE TABLE employee_dependents
(
  dependent_id   SERIAL PRIMARY KEY,
  employee_id    INT         NOT NULL,
  full_name      VARCHAR(160) NOT NULL,
  relationship   VARCHAR(30) NOT NULL,   -- SPOUSE, CHILD, PARENT
  date_of_birth  DATE,
  is_beneficiary BOOLEAN     NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_dep_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

CREATE TABLE employee_emergency_contacts
(
  contact_id    SERIAL PRIMARY KEY,
  employee_id   INT          NOT NULL,
  contact_name  VARCHAR(160) NOT NULL,
  relationship  VARCHAR(30)  NOT NULL,
  phone_number  VARCHAR(20)  NOT NULL,
  email         VARCHAR(150),
  CONSTRAINT fk_ec_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

-- 2C. BENEFITS ENROLLMENT

CREATE TABLE employee_benefits
(
  enrollment_id    SERIAL PRIMARY KEY,
  employee_id      INT           NOT NULL,
  benefit_type_id  INT           NOT NULL,
  plan_name        VARCHAR(100),
  employer_share   NUMERIC(15,2) NOT NULL DEFAULT 0,
  employee_share   NUMERIC(15,2) NOT NULL DEFAULT 0,
  coverage_start   DATE          NOT NULL,
  coverage_end     DATE,
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_eb_employee FOREIGN KEY (employee_id)     REFERENCES employees(employee_id),
  CONSTRAINT fk_eb_benefit  FOREIGN KEY (benefit_type_id) REFERENCES lib_benefit_types(benefit_type_id)
);

-- 2D. ATTENDANCE & TIME TRACKING

CREATE TABLE attendance_records
(
  attendance_id  SERIAL PRIMARY KEY,
  employee_id    INT         NOT NULL,
  work_date      DATE        NOT NULL,
  shift_type_id  INT,
  clock_in       TIMESTAMPTZ,
  clock_out      TIMESTAMPTZ,
  hours_worked   NUMERIC(5,2),
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  is_absent      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_late        BOOLEAN     NOT NULL DEFAULT FALSE,
  late_minutes   INT         DEFAULT 0,
  undertime_min  INT         DEFAULT 0,
  remarks        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_att_employee FOREIGN KEY (employee_id)  REFERENCES employees(employee_id),
  CONSTRAINT fk_att_shift    FOREIGN KEY (shift_type_id) REFERENCES lib_shift_types(shift_type_id),
  CONSTRAINT uq_att_emp_date UNIQUE (employee_id, work_date)
);

CREATE TABLE leave_requests
(
  leave_id       SERIAL PRIMARY KEY,
  employee_id    INT         NOT NULL,
  leave_type_id  INT         NOT NULL,
  start_date     DATE        NOT NULL,
  end_date       DATE        NOT NULL,
  total_days     NUMERIC(4,1) NOT NULL,
  reason         TEXT,
  status         VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED, CANCELLED
  approved_by    INT,
  approved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_lr_employee  FOREIGN KEY (employee_id)   REFERENCES employees(employee_id),
  CONSTRAINT fk_lr_leave     FOREIGN KEY (leave_type_id) REFERENCES lib_leave_types(leave_type_id),
  CONSTRAINT fk_lr_approver  FOREIGN KEY (approved_by)   REFERENCES employees(employee_id)
);

CREATE TABLE leave_balances
(
  balance_id     SERIAL PRIMARY KEY,
  employee_id    INT           NOT NULL,
  leave_type_id  INT           NOT NULL,
  fiscal_year    INT           NOT NULL,
  entitled_days  NUMERIC(5,1)  NOT NULL DEFAULT 0,
  used_days      NUMERIC(5,1)  NOT NULL DEFAULT 0,
  pending_days   NUMERIC(5,1)  NOT NULL DEFAULT 0,
  carried_over   NUMERIC(5,1)  NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_lb_employee FOREIGN KEY (employee_id)   REFERENCES employees(employee_id),
  CONSTRAINT fk_lb_leave    FOREIGN KEY (leave_type_id) REFERENCES lib_leave_types(leave_type_id),
  CONSTRAINT uq_lb_emp_type_yr UNIQUE (employee_id, leave_type_id, fiscal_year)
);

CREATE TABLE holidays
(
  holiday_id      SERIAL PRIMARY KEY,
  holiday_type_id INT         NOT NULL,
  country_id      INT         NOT NULL,
  holiday_name    VARCHAR(100) NOT NULL,
  holiday_date    DATE        NOT NULL,
  is_recurring    BOOLEAN     NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_hol_type    FOREIGN KEY (holiday_type_id) REFERENCES lib_holiday_types(holiday_type_id),
  CONSTRAINT fk_hol_country FOREIGN KEY (country_id)      REFERENCES lib_countries(country_id)
);

-- 2E. PAYROLL PROCESSING (COMMAND SIDE)

CREATE TABLE payroll_periods
(
  period_id       SERIAL PRIMARY KEY,
  org_id          INT         NOT NULL,
  frequency_id    INT         NOT NULL,
  period_label    VARCHAR(50) NOT NULL,          -- "2026-01 Period 1", "2026-W04"
  start_date      DATE        NOT NULL,
  end_date        DATE        NOT NULL,
  pay_date        DATE        NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',  -- DRAFT, PROCESSING, APPROVED, PAID, VOID
  created_by      INT,
  approved_by     INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at     TIMESTAMPTZ,
  CONSTRAINT fk_pp_org       FOREIGN KEY (org_id)       REFERENCES organizations(org_id),
  CONSTRAINT fk_pp_freq      FOREIGN KEY (frequency_id) REFERENCES lib_pay_frequencies(frequency_id),
  CONSTRAINT fk_pp_creator   FOREIGN KEY (created_by)   REFERENCES employees(employee_id),
  CONSTRAINT fk_pp_approver  FOREIGN KEY (approved_by)  REFERENCES employees(employee_id)
);

CREATE TABLE payroll_runs
(
  run_id          SERIAL PRIMARY KEY,
  period_id       INT           NOT NULL,
  run_number      INT           NOT NULL DEFAULT 1,   -- Allows re-runs / corrections
  total_gross     NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_net       NUMERIC(18,2) NOT NULL DEFAULT 0,
  employee_count  INT           NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',  -- DRAFT, CALCULATED, FINALIZED, REVERSED
  run_at          TIMESTAMPTZ,
  finalized_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_pr_period FOREIGN KEY (period_id) REFERENCES payroll_periods(period_id)
);

CREATE TABLE payslips
(
  payslip_id      SERIAL PRIMARY KEY,
  run_id          INT           NOT NULL,
  employee_id     INT           NOT NULL,
  employment_id   INT           NOT NULL,
  base_salary     NUMERIC(15,2) NOT NULL,
  total_earnings  NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_pay         NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency_id     INT           NOT NULL,
  status          VARCHAR(20)   NOT NULL DEFAULT 'GENERATED',  -- GENERATED, RELEASED, VOID
  released_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_ps_run        FOREIGN KEY (run_id)        REFERENCES payroll_runs(run_id),
  CONSTRAINT fk_ps_employee   FOREIGN KEY (employee_id)   REFERENCES employees(employee_id),
  CONSTRAINT fk_ps_employment FOREIGN KEY (employment_id) REFERENCES employee_employment(employment_id),
  CONSTRAINT fk_ps_currency   FOREIGN KEY (currency_id)   REFERENCES lib_currencies(currency_id)
);

CREATE TABLE payslip_earnings
(
  earning_id      SERIAL PRIMARY KEY,
  payslip_id      INT           NOT NULL,
  earning_type_id INT           NOT NULL,
  description     VARCHAR(150),
  hours           NUMERIC(6,2),
  rate            NUMERIC(12,4),
  amount          NUMERIC(15,2) NOT NULL,
  is_taxable      BOOLEAN       NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_pe_payslip FOREIGN KEY (payslip_id)      REFERENCES payslips(payslip_id),
  CONSTRAINT fk_pe_type    FOREIGN KEY (earning_type_id)  REFERENCES lib_earning_types(earning_type_id)
);

CREATE TABLE payslip_deductions
(
  deduction_id      SERIAL PRIMARY KEY,
  payslip_id        INT           NOT NULL,
  deduction_type_id INT           NOT NULL,
  description       VARCHAR(150),
  amount            NUMERIC(15,2) NOT NULL,
  is_statutory      BOOLEAN       NOT NULL DEFAULT FALSE,
  reference_number  VARCHAR(50),                         -- Loan ref, etc.
  CONSTRAINT fk_pd_payslip FOREIGN KEY (payslip_id)        REFERENCES payslips(payslip_id),
  CONSTRAINT fk_pd_type    FOREIGN KEY (deduction_type_id) REFERENCES lib_deduction_types(deduction_type_id)
);

CREATE TABLE payslip_taxes
(
  tax_id       SERIAL PRIMARY KEY,
  payslip_id   INT           NOT NULL,
  bracket_id   INT,
  taxable_income NUMERIC(15,2) NOT NULL,
  tax_amount   NUMERIC(15,2) NOT NULL,
  ytd_tax      NUMERIC(15,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_pt_payslip FOREIGN KEY (payslip_id) REFERENCES payslips(payslip_id),
  CONSTRAINT fk_pt_bracket FOREIGN KEY (bracket_id) REFERENCES lib_tax_brackets(bracket_id)
);

-- 2F. LOANS & RECURRING DEDUCTIONS

CREATE TABLE employee_loans
(
  loan_id            SERIAL PRIMARY KEY,
  employee_id        INT           NOT NULL,
  deduction_type_id  INT           NOT NULL,
  loan_reference     VARCHAR(50),
  principal_amount   NUMERIC(15,2) NOT NULL,
  interest_rate_pct  NUMERIC(5,4)  DEFAULT 0,
  total_amortization INT           NOT NULL,        -- total number of installments
  monthly_deduction  NUMERIC(15,2) NOT NULL,
  remaining_balance  NUMERIC(15,2) NOT NULL,
  start_date         DATE          NOT NULL,
  end_date           DATE,
  status             VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, PAID, DEFAULTED, CANCELLED
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_loan_employee  FOREIGN KEY (employee_id)     REFERENCES employees(employee_id),
  CONSTRAINT fk_loan_ded_type  FOREIGN KEY (deduction_type_id) REFERENCES lib_deduction_types(deduction_type_id)
);

CREATE TABLE loan_payments
(
  payment_id    SERIAL PRIMARY KEY,
  loan_id       INT           NOT NULL,
  payslip_id    INT,
  payment_date  DATE          NOT NULL,
  amount_paid   NUMERIC(15,2) NOT NULL,
  running_balance NUMERIC(15,2) NOT NULL,
  CONSTRAINT fk_lp_loan    FOREIGN KEY (loan_id)    REFERENCES employee_loans(loan_id),
  CONSTRAINT fk_lp_payslip FOREIGN KEY (payslip_id) REFERENCES payslips(payslip_id)
);

-- 2G. YEAR-TO-DATE ACCUMULATORS

CREATE TABLE ytd_summaries
(
  ytd_id            SERIAL PRIMARY KEY,
  employee_id       INT           NOT NULL,
  fiscal_year       INT           NOT NULL,
  total_gross       NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_taxable     NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_tax         NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_sss         NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_philhealth  NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_pagibig     NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_other_ded   NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_net         NUMERIC(18,2) NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_ytd_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
  CONSTRAINT uq_ytd_emp_year UNIQUE (employee_id, fiscal_year)
);

-- 2H. DISBURSEMENT / PAYMENT TRACKING

CREATE TABLE disbursements
(
  disbursement_id   SERIAL PRIMARY KEY,
  run_id            INT           NOT NULL,
  payslip_id        INT           NOT NULL,
  employee_id       INT           NOT NULL,
  bank_account_id   INT,
  payment_method    VARCHAR(20)   NOT NULL DEFAULT 'BANK_TRANSFER',  -- BANK_TRANSFER, CHECK, CASH
  reference_number  VARCHAR(50),
  amount            NUMERIC(15,2) NOT NULL,
  currency_id       INT           NOT NULL,
  status            VARCHAR(20)   NOT NULL DEFAULT 'PENDING',  -- PENDING, SENT, COMPLETED, FAILED
  disbursed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_disb_run      FOREIGN KEY (run_id)          REFERENCES payroll_runs(run_id),
  CONSTRAINT fk_disb_payslip  FOREIGN KEY (payslip_id)      REFERENCES payslips(payslip_id),
  CONSTRAINT fk_disb_employee FOREIGN KEY (employee_id)     REFERENCES employees(employee_id),
  CONSTRAINT fk_disb_bank     FOREIGN KEY (bank_account_id) REFERENCES employee_bank_accounts(bank_account_id),
  CONSTRAINT fk_disb_currency FOREIGN KEY (currency_id)     REFERENCES lib_currencies(currency_id)
);

-- 2I. AUDIT TRAIL

CREATE TABLE audit_logs
(
  log_id        BIGSERIAL PRIMARY KEY,
  entity_type   VARCHAR(50)  NOT NULL,     -- 'payslip', 'employee', 'payroll_run', etc.
  entity_id     INT          NOT NULL,
  action        VARCHAR(20)  NOT NULL,     -- CREATE, UPDATE, DELETE, APPROVE, VOID
  changed_by    INT,
  old_values    JSONB,
  new_values    JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_audit_user FOREIGN KEY (changed_by) REFERENCES employees(employee_id)
);

-- ============================================================================
-- SECTION 3: CQRS READ SIDE — DENORMALIZED QUERY VIEWS
-- ============================================================================
-- These views flatten normalized joins for fast reads.
-- In production, materialize these for dashboard / reporting performance.
-- ============================================================================

-- 3A. EMPLOYEE DIRECTORY (flattened for HR dashboards)
CREATE VIEW vw_employee_directory AS
SELECT
  e.employee_id,
  e.employee_code,
  e.first_name || ' ' || COALESCE(e.middle_name || ' ', '') || e.last_name || COALESCE(' ' || e.suffix, '') AS full_name,
  e.contact_email,
  e.contact_phone,
  e.date_of_birth,
  e.gender,
  e.marital_status,
  o.org_name,
  b.branch_name,
  d.department_name,
  p.position_title,
  p.pay_grade,
  et.type_name        AS employment_type,
  es.status_name      AS employment_status,
  ee.hire_date,
  ee.regularization_date,
  ee.base_salary,
  cur.currency_code,
  pf.frequency_name   AS pay_frequency,
  st.shift_name,
  ee.effective_from,
  ee.effective_to
FROM employees e
JOIN employee_employment ee ON ee.employee_id = e.employee_id AND ee.is_current = TRUE
JOIN organizations o        ON o.org_id = e.org_id
LEFT JOIN org_branches b    ON b.branch_id = ee.branch_id
JOIN lib_positions p        ON p.position_id = ee.position_id
JOIN lib_departments d      ON d.department_id = p.department_id
JOIN lib_employment_types et  ON et.employment_type_id = ee.employment_type_id
JOIN lib_employment_statuses es ON es.status_id = ee.status_id
JOIN lib_pay_frequencies pf ON pf.frequency_id = ee.pay_frequency_id
JOIN lib_currencies cur     ON cur.currency_id = ee.currency_id
LEFT JOIN lib_shift_types st ON st.shift_type_id = ee.shift_type_id;


-- 3B. PAYSLIP SUMMARY (flattened for employee self-service portal)
CREATE VIEW vw_payslip_summary AS
SELECT
  ps.payslip_id,
  e.employee_code,
  e.first_name || ' ' || e.last_name AS employee_name,
  d.department_name,
  p.position_title,
  pp.period_label,
  pp.start_date       AS period_start,
  pp.end_date         AS period_end,
  pp.pay_date,
  ps.base_salary,
  ps.total_earnings,
  ps.total_deductions,
  ps.net_pay,
  cur.currency_code,
  cur.symbol           AS currency_symbol,
  ps.status            AS payslip_status,
  pr.status            AS run_status,
  ps.released_at
FROM payslips ps
JOIN payroll_runs pr    ON pr.run_id = ps.run_id
JOIN payroll_periods pp ON pp.period_id = pr.period_id
JOIN employees e        ON e.employee_id = ps.employee_id
JOIN employee_employment ee ON ee.employment_id = ps.employment_id
JOIN lib_positions p    ON p.position_id = ee.position_id
JOIN lib_departments d  ON d.department_id = p.department_id
JOIN lib_currencies cur ON cur.currency_id = ps.currency_id;


-- 3C. PAYROLL RUN DASHBOARD (flattened for finance / manager overview)
CREATE VIEW vw_payroll_dashboard AS
SELECT
  pr.run_id,
  pp.period_label,
  pp.start_date,
  pp.end_date,
  pp.pay_date,
  pf.frequency_name,
  o.org_name,
  pr.run_number,
  pr.employee_count,
  pr.total_gross,
  pr.total_deductions,
  pr.total_net,
  pr.status       AS run_status,
  pp.status       AS period_status,
  pr.run_at,
  pr.finalized_at
FROM payroll_runs pr
JOIN payroll_periods pp ON pp.period_id = pr.period_id
JOIN organizations o    ON o.org_id = pp.org_id
JOIN lib_pay_frequencies pf ON pf.frequency_id = pp.frequency_id;


-- 3D. ATTENDANCE REPORT (flattened for timesheet review)
CREATE VIEW vw_attendance_report AS
SELECT
  ar.attendance_id,
  e.employee_code,
  e.first_name || ' ' || e.last_name AS employee_name,
  d.department_name,
  ar.work_date,
  st.shift_name,
  ar.clock_in,
  ar.clock_out,
  ar.hours_worked,
  ar.overtime_hours,
  ar.is_absent,
  ar.is_late,
  ar.late_minutes,
  ar.undertime_min,
  ar.remarks
FROM attendance_records ar
JOIN employees e             ON e.employee_id = ar.employee_id
JOIN employee_employment ee  ON ee.employee_id = e.employee_id AND ee.is_current = TRUE
JOIN lib_positions p         ON p.position_id = ee.position_id
JOIN lib_departments d       ON d.department_id = p.department_id
LEFT JOIN lib_shift_types st ON st.shift_type_id = ar.shift_type_id;


-- 3E. LEAVE TRACKER (flattened for leave management)
CREATE VIEW vw_leave_tracker AS
SELECT
  lr.leave_id,
  e.employee_code,
  e.first_name || ' ' || e.last_name AS employee_name,
  d.department_name,
  lt.type_name    AS leave_type,
  lt.is_paid,
  lr.start_date,
  lr.end_date,
  lr.total_days,
  lr.reason,
  lr.status,
  approver.first_name || ' ' || approver.last_name AS approved_by_name,
  lr.approved_at,
  lb.entitled_days,
  lb.used_days,
  lb.pending_days,
  (lb.entitled_days + lb.carried_over - lb.used_days - lb.pending_days) AS remaining_days
FROM leave_requests lr
JOIN employees e             ON e.employee_id = lr.employee_id
JOIN employee_employment ee  ON ee.employee_id = e.employee_id AND ee.is_current = TRUE
JOIN lib_positions p         ON p.position_id = ee.position_id
JOIN lib_departments d       ON d.department_id = p.department_id
JOIN lib_leave_types lt      ON lt.leave_type_id = lr.leave_type_id
LEFT JOIN employees approver ON approver.employee_id = lr.approved_by
LEFT JOIN leave_balances lb  ON lb.employee_id = lr.employee_id
                            AND lb.leave_type_id = lr.leave_type_id
                            AND lb.fiscal_year = EXTRACT(YEAR FROM lr.start_date);


-- 3F. LOAN LEDGER (flattened for loan tracking)
CREATE VIEW vw_loan_ledger AS
SELECT
  el.loan_id,
  e.employee_code,
  e.first_name || ' ' || e.last_name AS employee_name,
  dt.type_name           AS loan_type,
  el.loan_reference,
  el.principal_amount,
  el.interest_rate_pct,
  el.total_amortization,
  el.monthly_deduction,
  el.remaining_balance,
  el.start_date,
  el.end_date,
  el.status
FROM employee_loans el
JOIN employees e            ON e.employee_id = el.employee_id
JOIN lib_deduction_types dt ON dt.deduction_type_id = el.deduction_type_id;


-- 3G. YTD TAX CERTIFICATE (flattened for BIR 2316 / W-2 generation)
CREATE VIEW vw_ytd_tax_certificate AS
SELECT
  y.ytd_id,
  e.employee_code,
  e.first_name || ' ' || e.last_name AS employee_name,
  e.tax_id,
  e.sss_number,
  e.philhealth_number,
  e.pagibig_number,
  o.org_name          AS employer_name,
  o.tax_id_num        AS employer_tin,
  y.fiscal_year,
  y.total_gross,
  y.total_taxable,
  y.total_tax,
  y.total_sss,
  y.total_philhealth,
  y.total_pagibig,
  y.total_other_ded,
  y.total_net
FROM ytd_summaries y
JOIN employees e     ON e.employee_id = y.employee_id
JOIN organizations o ON o.org_id = e.org_id;


-- 3H. DISBURSEMENT REPORT (flattened for treasury / bank file generation)
CREATE VIEW vw_disbursement_report AS
SELECT
  db.disbursement_id,
  e.employee_code,
  e.first_name || ' ' || e.last_name AS employee_name,
  bk.bank_name,
  ba.account_number,
  ba.account_type,
  db.payment_method,
  db.reference_number,
  db.amount,
  cur.currency_code,
  pp.period_label,
  pp.pay_date,
  db.status            AS disbursement_status,
  db.disbursed_at
FROM disbursements db
JOIN employees e             ON e.employee_id = db.employee_id
JOIN payroll_runs pr         ON pr.run_id = db.run_id
JOIN payroll_periods pp      ON pp.period_id = pr.period_id
JOIN lib_currencies cur      ON cur.currency_id = db.currency_id
LEFT JOIN employee_bank_accounts ba ON ba.bank_account_id = db.bank_account_id
LEFT JOIN lib_banks bk       ON bk.bank_id = ba.bank_id;


-- ============================================================================
-- SECTION 4: INDEXES FOR QUERY PERFORMANCE
-- ============================================================================

CREATE INDEX idx_emp_org             ON employees(org_id);
CREATE INDEX idx_emp_code            ON employees(employee_code);
CREATE INDEX idx_ee_employee         ON employee_employment(employee_id);
CREATE INDEX idx_ee_current          ON employee_employment(employee_id, is_current);
CREATE INDEX idx_att_employee_date   ON attendance_records(employee_id, work_date);
CREATE INDEX idx_lr_employee         ON leave_requests(employee_id);
CREATE INDEX idx_lr_status           ON leave_requests(status);
CREATE INDEX idx_ps_run              ON payslips(run_id);
CREATE INDEX idx_ps_employee         ON payslips(employee_id);
CREATE INDEX idx_pr_period           ON payroll_runs(period_id);
CREATE INDEX idx_pp_org_dates        ON payroll_periods(org_id, start_date, end_date);
CREATE INDEX idx_disb_run            ON disbursements(run_id);
CREATE INDEX idx_disb_employee       ON disbursements(employee_id);
CREATE INDEX idx_loan_employee       ON employee_loans(employee_id);
CREATE INDEX idx_ytd_employee_year   ON ytd_summaries(employee_id, fiscal_year);
CREATE INDEX idx_audit_entity        ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_changed_by    ON audit_logs(changed_by);
CREATE INDEX idx_audit_created       ON audit_logs(created_at);
