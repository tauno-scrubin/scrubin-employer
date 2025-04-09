// scrubin.ts
import { PUBLIC_ORIGIN } from '$env/static/public';

// ─── INTERFACES ───────────────────────────────────────────────────────────────

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expiresAt: string;
}

interface JwtPayload {
  sub: number;
  subType: string;
  type: string;
  iat: number;
  exp: number;
}

// Removed Advertiser, Campaign, CampaignDetails, and AdvertiserProfile

export interface PortalUser {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  calendarLink: string;
  isDemoUser: boolean;
  passwordSet: boolean;
  status?: "pending" | "active"
}

export interface UpdatePortalUser {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  calendarLink: string;
}

export interface UpdatePortalUserPassword {
  oldPassword: string;
  newPassword: string;
}

export interface SignupPayload {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  type: string;
  password: string;
}

export interface SignupCompanyPayload {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  companyName: string;
}

// Company interface as provided by the endpoints
export interface Company {
  companyLegalName: string;
  brandName: string;
  description: string;
  country: string;
  countryIso: string;
  registrationCode: string;
  vatNumber: string;
  address: {
    stateProvinceRegion: string;
    city: string;
    address: string;
    zipCode: string;
  };
}

// New interfaces for the hunt endpoints
export interface WorkerLookup {
  workerLookupId: number;
  userInput: string;
  createdAt: string;
}

export interface WorkerLookupsResponse {
  items: WorkerLookup[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface Candidate {
  id: string;
  professions: string[];
  languages: string[];
  verifications: string[];
  professionRegistrationCountry: string;
  speciality: string[];
  recentlyActive: boolean;
  verified: boolean;
  totalWorkExperience: number;
  countriesLookingForJob: string[];
  preferredLocations: string[];
  preferredSpeciality: string[];
  preferredFacilityTypes: string[];
  interestedOffers: string[];
  top3Terms: string[];
}

export interface AnalyzeResponse {
  userInput: string;
  workerLookupId: number;
  totalCandidates: number;
  examplesCandidates: Candidate[];
}

export interface ActivateHuntResponse {
  huntId: number;
  dateActivated: string;
  dateCompleted: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  requirements: Requirements['requirements'];
}

export interface AllRequirementsResponse {
  items: Requirements['requirements'][];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface Requirements {
  requirements: {
    id: number;
    jobTitle: string;
    professions: string[];
    specialization: string;
    createdDateTime: string;
    modifiedDateTime: string;
    dateCreated: string;
    jobRequiredQualifications: string;
    jobRequiredWorkExperience: number;
    jobRequiredLanguages: string[];
    numberOfCandidates: number;
    jobDescription: string;
    country: string;
    address: {
      address: string;
      stateProvinceRegion: string | string[];
      city: string;
      cityBorough: string | string[];
    };
    workTimeType: string[];
    salary: {
      amountStart: number | null;
      amountEnd: number | null;
      currency: string | null;
      type: 'HOURLY';
      amountText: string;
      salaryExtra: string;
    };
    extras: {
      accommodationCompensationType: string | null;
      drivingLicenceRequired: boolean;
      personalCarRequired: boolean;
      transportCompensationType: string | null;
    };
  };
  canBeActivated: boolean;
  followUpQuestions?: string[];
  followUpQuestionsV2?: Array<{
    description: string;
    title: string;
  }>;
  hiringPlan: {
    hiringDemand: number;
    hiringMinimumPeriodInMonths: number;
    hiringInitialPriceForOneCandidate?: {
      amount: number;
      currency: string;
    };
  };
  chatHistory?: Array<{
    role: string;
    content: string;
    dateTime: string;
  }>;
}

// Add new interface for hunt instructions
export interface HuntInstructions {
  preferredCountriesToSearch: string[];
  onlyCountriesToSearch: string[];
  companyContext: string;
}

// Extend the existing Requirements interface
export interface RequirementsWithInstructions extends Requirements {
  huntInstructions?: HuntInstructions;
}

// New interfaces for the hunts endpoints
export interface Hunt {
  huntId: number;
  title: string;
  dateActivated: string;
  dateCompleted: string | null;
  status: string;
}

export interface HuntsResponse {
  items: Hunt[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface HuntDetail {
  huntId: number;
  requirements: Requirements['requirements'];
  dateActivated: string;
  dateCompleted: string | null;
  status: string;
  totalScoredHuntables: number;
}

export interface HuntStats {
  huntId: number;
  totalHuntables: number;
  totalHuntablesContacted: number;
  totalHuntablesInterested: number;
}

export interface HuntCandidate {
  status: string;
  huntable: Candidate;
  score: number;
}

export interface HuntCandidatesResponse {
  items: HuntCandidate[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface PaymentMethod {
  brand: string;
  last4Digits: string;
  expirationMonth: number;
  expirationYear: number;
}

// Add new interfaces for billing and payment
export interface CompanyBilling {
  stripeCustomerId: string;
  stripePaymentMethodId: string;
  stripePaymentMethod?: PaymentMethod;
}

export interface CompanyBillingRequest {
  stripeCustomerId?: string;
  stripePaymentMethodId?: string;
}

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
}

export interface HuntPaymentResponse extends PaymentIntent {
  hunt?: Hunt;
  paymentStatus?: string;
}

// Add new interfaces for the huntable details
export interface WorkExperience {
  company: string;
  desc: string;
  start: string;
  end: string;
}

export interface Education {
  school: string;
  speciality: string;
  startYear: number;
  endYear: number;
}

export interface Training {
  name: string;
  description: string;
  date: string;
}

export interface HuntableDetails extends Candidate {
  userDesc: string;
  workExperiences: WorkExperience[];
  educations: Education[];
  trainings: Training[];
  otherSkills?: string[];
  softSkills?: string[];
}

export interface InterestedCandidate {
  candidateId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateInterested: string;
}

export interface Message {
  id: number;
  message: string;
  date: string;
  senderName: string;
  sentByMe: boolean;
  dateRead: string;
}

export interface InternalNote {
  id: number;
  date: string;
  note: string;
  creatorId: number;
  creatorName: string;
}

export interface InterestedCandidateDetails extends HuntableDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  professionNumbers?: Array<{
    countryRegistered: string;
    number: string;
  }>;
  dateInterested: string;
  dateInterview?: string;
  notes?: string;
}

export interface ChatMessage {
  id: number;
  message: string;
  date: string;
  sentByCandidate: boolean;
  dateRead: string;
}

export interface UpdateCandidateNotesRequest {
  notes: string;
}

export interface CreateChatMessageRequest {
  message: string;
}

// Add this interface with the other interfaces
export interface ContextQuestion {
  answer: string;
  id: number;
  question: string;
  date: string;
}

// ─── AUTH STORE ───────────────────────────────────────────────────────────────

class AuthStore {
  private refreshToken: string | null = null;
  private accessToken: string | null = null;

  get rToken(): string | null {
    if (typeof document === 'undefined') {
      return this.refreshToken;
    }
    return JSON.parse(this.getCookie('scrubin_auth') || '{}').refresh;
  }

  get token(): string | null {
    if (typeof document === 'undefined') {
      return this.accessToken;
    }
    return JSON.parse(this.getCookie('scrubin_auth') || '{}').jwt;
  }

  get isValid(): boolean {
    const token = this.token;
    if (!token) return false;
    try {
      const payload = this.decodeToken(token);
      const expired = new Date(payload.exp * 1000) < new Date();
      return !expired;
    } catch {
      return false;
    }
  }

  get model(): any {
    const token = this.token;
    if (!token) return null;
    return this.decodeToken(token);
  }

  get verified(): boolean {
    return this.model?.verified || false;
  }

  private decodeToken(token: string): JwtPayload {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  }

  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }

  async refresh(baseUrl: string): Promise<boolean> {
    if (!this.rToken) {
      throw new Error('No refresh token available');
    }
    console.log("refreshing token");

    const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.rToken }),
      credentials: 'include'
    });

    if (!response.ok) {
      this.clear();
      throw new Error('Failed to refresh token');
    }

    const data: AuthResponse = await response.json();
    this.setRefreshToken(data.refresh_token);
    this.setAccessToken(data.access_token);
    return true;
  }

  clear(): void {
    this.refreshToken = null;
    this.accessToken = null;
    if (typeof document !== 'undefined') {
      document.cookie = 'scrubin_auth=; path=/; SameSite=Strict';
    }
  }

  exportToCookie(options: { secure?: boolean; httpOnly?: boolean; domain?: string } = {}): string {
    const refreshToken = this.refreshToken || this.rToken;
    const jwtAccess = this.accessToken || this.token;

    const cookieOptions = [
      `scrubin_auth=${JSON.stringify({ jwt: jwtAccess, refresh: refreshToken })}`,
      `path=/`,
      options.domain ? `domain=${options.domain}` : null,
      options.secure ? 'Secure' : null,
      options.httpOnly ? 'HttpOnly' : null,
      'SameSite=Strict'
    ].filter(Boolean).join('; ');

    return cookieOptions;
  }

  loadFromCookie(cookieString: string): void {
    if (!cookieString) return;
    const cookies = cookieString.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'scrubin_auth') {
        const { jwt, refresh } = JSON.parse(value);
        this.accessToken = jwt;
        this.refreshToken = refresh;
        if (typeof document !== 'undefined') {
          document.cookie = `scrubin_auth=${JSON.stringify({ jwt, refresh })}; path=/; SameSite=Strict`;
        }
      }
    }
  }

  setRefreshToken(token: string): void {
    this.refreshToken = token;
    if (typeof document !== 'undefined') {
      document.cookie = `scrubin_auth=${JSON.stringify({ jwt: this.accessToken, refresh: token })}; path=/; SameSite=Strict`;
    }
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
    if (typeof document !== 'undefined') {
      document.cookie = `scrubin_auth=${JSON.stringify({ jwt: token, refresh: this.refreshToken })}; path=/; SameSite=Strict`;
    }
  }
}

// ─── BASE RESOURCE ────────────────────────────────────────────────────────────

class BaseResource {
  constructor(protected client: ScrubinClient, protected path: string) {}

  protected async request<T>(
    method: string,
    url: string,
    data?: any,
    expectNoContent?: boolean
  ): Promise<T | void> {
    await this.client.ensureAuth();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.client.authStore.token}`,
      
      "Origin": PUBLIC_ORIGIN
    };

    if (this.client.authStore.token) {
      headers['Cookie'] = this.client.authStore.exportToCookie();
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: 'include',
      mode: 'cors'
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);

      if (response.status === 0 || response.type === 'opaque') {
        throw new Error('CORS error: No access to the requested resource');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message ||
          `Request failed with status ${response.status}: ${response.statusText}`
        );
      }

      if (expectNoContent) {
        return;
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`${error.message}`);
      }
      throw error;
    }
  }

  async get<T = any>(params?: Record<string, any>): Promise<T> {
    const url = new URL(this.path, this.client.baseUrl);
    if (params) {
      url.search = new URLSearchParams(params).toString();
    }
    return this.request<T>('GET', url.toString()) as Promise<T>;
  }

  async getOne<T = any>(id: string | number): Promise<T> {
    const url = new URL(`${this.path}/${id}`, this.client.baseUrl);
    return this.request<T>('GET', url.toString()) as Promise<T>;
  }
}

// ─── RESOURCE CLASSES ─────────────────────────────────────────────────────────

// Portal endpoints (unchanged)
class PortalResource extends BaseResource {
  constructor(client: ScrubinClient) {
    super(client, '/api/v1/portal/user');
  }

  async getUser(): Promise<PortalUser> {
    const url = new URL(this.path, this.client.baseUrl);
    return this.request<PortalUser>('GET', url.toString()) as Promise<PortalUser>;
  }

  async updateUser(data: UpdatePortalUser): Promise<UpdatePortalUser> {
    const url = new URL(this.path, this.client.baseUrl);
    return this.request<UpdatePortalUser>('PUT', url.toString(), data) as Promise<UpdatePortalUser>;
  }

  async updatePassword(data: UpdatePortalUserPassword): Promise<UpdatePortalUserPassword> {
    const url = new URL(`${this.path}/password`, this.client.baseUrl);
    return this.request<UpdatePortalUserPassword>('PUT', url.toString(), data, true) as Promise<UpdatePortalUserPassword>;
  }
}

// Company endpoints
class CompanyResource extends BaseResource {
  constructor(client: ScrubinClient) {
    super(client, '/api/v1/company');
  }

  async getCompany(): Promise<Company> {
    const url = new URL(this.path, this.client.baseUrl);
    return this.request<Company>('GET', url.toString()) as Promise<Company>;
  }

  async createCompany(data: Company): Promise<Company> {
    const url = new URL(this.path, this.client.baseUrl);
    return this.request<Company>('POST', url.toString(), data) as Promise<Company>;
  }

  async updateCompany(data: Company): Promise<Company> {
    const url = new URL(this.path, this.client.baseUrl);
    return this.request<Company>('PUT', url.toString(), data) as Promise<Company>;
  }

  async getCountries(): Promise<string[]> {
    const url = new URL(`/api/v1/data/countries`, this.client.baseUrl);
    return this.request<string[]>('GET', url.toString()) as Promise<string[]>;
  }

  async getBilling(): Promise<CompanyBilling> {
    const url = new URL(`${this.path}/billing`, this.client.baseUrl);
    return this.request<CompanyBilling>('GET', url.toString()) as Promise<CompanyBilling>;
  }

  async updateBillingStripe(data: CompanyBillingRequest): Promise<CompanyBilling> {
    const url = new URL(`${this.path}/billing/stripe`, this.client.baseUrl);
    return this.request<CompanyBilling>('PATCH', url.toString(), data) as Promise<CompanyBilling>;
  }
}

// Hunt endpoints
class HuntResource extends BaseResource {
  constructor(client: ScrubinClient) {
    super(client, '/api/v1/hunt');
  }

  // GET /api/v1/hunt/worker-lookups
  async getWorkerLookups(): Promise<WorkerLookupsResponse> {
    const url = new URL(`${this.path}/worker-lookups`, this.client.baseUrl);
    return this.request<WorkerLookupsResponse>('GET', url.toString()) as Promise<WorkerLookupsResponse>;
  }

  // POST /api/v1/hunt/worker-lookups/analyze
  async analyzeWorkerLookups(description: string): Promise<AnalyzeResponse> {
    const url = new URL(`${this.path}/worker-lookups/analyze`, this.client.baseUrl);
    return this.request<AnalyzeResponse>('POST', url.toString(), { description }) as Promise<AnalyzeResponse>;
  }

  // POST /api/v1/hunt/requirements/analyze
  async createJobRequirements(workerLookupId: number, favoriteCandidateIds: string[]): Promise<Requirements> {
    const url = new URL(`${this.path}/requirements/create`, this.client.baseUrl);
    return this.request<Requirements>('POST', url.toString(), { workerLookupId, favoriteCandidateIds }) as Promise<Requirements>;
  }

  // PUT /api/v1/hunt/requirements/{id}/analyze
  async updateRequirements(id: number, textInput: string): Promise<RequirementsWithInstructions> {
    const url = new URL(`${this.path}/requirements/${id}/analyze`, this.client.baseUrl);
    return this.request<RequirementsWithInstructions>('PUT', url.toString(), { textInput }) as Promise<RequirementsWithInstructions>;
  }

  // PUT /api/v1/hunt/requirements/{id}/activate
  async activateRequirements(id: number): Promise<ActivateHuntResponse> {
    const url = new URL(`${this.path}/requirements/${id}/activate-hunt`, this.client.baseUrl);
    return this.request<ActivateHuntResponse>('POST', url.toString()) as Promise<ActivateHuntResponse>;
  }

  async getAnalyzeResult(id: number): Promise<Requirements['requirements']> {
    const url = new URL(`${this.path}/requirements/${id}/analyze-result`, this.client.baseUrl);
    return this.request<Requirements['requirements']>('GET', url.toString()) as Promise<Requirements['requirements']>;
  }

  async getAllRequirements(): Promise<AllRequirementsResponse> {
    const url = new URL(`${this.path}/requirements`, this.client.baseUrl);
    return this.request<AllRequirementsResponse>('GET', url.toString()) as Promise<AllRequirementsResponse>;
  }

  async getRequirements(id: number): Promise<Requirements['requirements']> {
    const url = new URL(`${this.path}/requirements/${id}`, this.client.baseUrl);
    return this.request<Requirements['requirements']>('GET', url.toString()) as Promise<Requirements['requirements']>;
  }

  // GET /api/v1/hunts
  async getHunts(page: number = 0, size: number = 20): Promise<HuntsResponse> {
    const url = new URL('/api/v1/hunts', this.client.baseUrl);
    url.search = new URLSearchParams({ page: page.toString(), size: size.toString() }).toString();
    return this.request<HuntsResponse>('GET', url.toString()) as Promise<HuntsResponse>;
  }

  // GET /api/v1/hunts/{id}
  async getHuntById(id: number): Promise<HuntDetail> {
    const url = new URL(`/api/v1/hunts/${id}`, this.client.baseUrl);
    return this.request<HuntDetail>('GET', url.toString()) as Promise<HuntDetail>;
  }

  // GET /api/v1/hunts/{id}/stats
  async getHuntStats(id: number): Promise<HuntStats> {
    const url = new URL(`/api/v1/hunts/${id}/stats`, this.client.baseUrl);
    return this.request<HuntStats>('GET', url.toString()) as Promise<HuntStats>;
  }

  // GET /api/v1/hunts/{id}/candidates
  async getHuntCandidates(id: number, page: number = 0, size: number = 20): Promise<HuntCandidatesResponse> {
    const url = new URL(`/api/v1/hunts/${id}/candidates`, this.client.baseUrl);
    url.search = new URLSearchParams({ page: page.toString(), size: size.toString() }).toString();
    return this.request<HuntCandidatesResponse>('GET', url.toString()) as Promise<HuntCandidatesResponse>;
  }

  // POST /api/v1/hunt/requirements/{id}/create-hunt
  async createHuntFromRequirements(id: number): Promise<HuntDetail> {
    const url = new URL(`${this.path}/requirements/${id}/create-hunt`, this.client.baseUrl);
    return this.request<HuntDetail>('POST', url.toString()) as Promise<HuntDetail>;
  }

  // POST /api/v1/hunts/{id}/payment-intent
  async createPaymentIntent(id: number): Promise<PaymentIntent> {
    const url = new URL(`/api/v1/hunts/${id}/payment-intent`, this.client.baseUrl);
    return this.request<PaymentIntent>('POST', url.toString()) as Promise<PaymentIntent>;
  }

  // POST /api/v1/hunts/{id}/activate
  async activateHunt(id: number, paymentIntentId: string, paymentMethodId: string): Promise<HuntPaymentResponse> {
    const url = new URL(`/api/v1/hunts/${id}/activate`, this.client.baseUrl);
    return this.request<HuntPaymentResponse>('POST', url.toString(), {
      paymentIntentId,
      paymentMethodId
    }) as Promise<HuntPaymentResponse>;
  }

  // GET /api/v1/landing/worker-lookups/{lookupId}/huntable/{id}
  async getHuntableDetails(lookupId: string, id: string): Promise<HuntableDetails> {
    const url = new URL(`/api/v1/hunt/worker-lookups/${lookupId}/huntable/${id}`, this.client.baseUrl);
    return this.request<HuntableDetails>('GET', url.toString()) as Promise<HuntableDetails>;
  }

  // GET /api/v1/hunts/{id}/interested-candidates
  async getInterestedCandidates(id: number): Promise<InterestedCandidate[]> {
    const url = new URL(`/api/v1/hunts/${id}/interested-candidates`, this.client.baseUrl);
    return this.request<InterestedCandidate[]>('GET', url.toString()) as Promise<InterestedCandidate[]>;
  }

  // GET /api/v1/hunts/{id}/interested-candidates/{candidateId}
  async getInterestedCandidateDetails(id: number, candidateId: number): Promise<InterestedCandidateDetails> {
    const url = new URL(`/api/v1/hunts/${id}/interested-candidates/${candidateId}`, this.client.baseUrl);
    return this.request<InterestedCandidateDetails>('GET', url.toString()) as Promise<InterestedCandidateDetails>;
  }

  // PUT /api/v1/hunts/{id}/interested-candidates/{candidateId}/notes
  async updateInterestedCandidateNotes(id: number, candidateId: number, notes: string): Promise<void> {
    const url = new URL(`/api/v1/hunts/${id}/interested-candidates/${candidateId}/notes`, this.client.baseUrl);
    return this.request<void>('PUT', url.toString(), { notes }, true) as Promise<void>;
  }

  // GET /api/v1/hunts/{id}/interested-candidates/{candidateId}/chat
  async getInterestedCandidateChat(id: number, candidateId: number): Promise<ChatMessage[]> {
    const url = new URL(`/api/v1/hunts/${id}/interested-candidates/${candidateId}/chat`, this.client.baseUrl);
    return this.request<ChatMessage[]>('GET', url.toString()) as Promise<ChatMessage[]>;
  }

  // POST /api/v1/hunts/{id}/interested-candidates/{candidateId}/chat
  async createInterestedCandidateMessage(id: number, candidateId: number, message: string): Promise<ChatMessage[]> {
    const url = new URL(`/api/v1/hunts/${id}/interested-candidates/${candidateId}/chat`, this.client.baseUrl);
    return this.request<ChatMessage[]>('POST', url.toString(), { message }) as Promise<ChatMessage[]>;
  }

  // GET /api/v1/hunts/{id}/context-questions
  async getHuntContextQuestions(id: number): Promise<ContextQuestion[]> {
    const url = new URL(`/api/v1/hunts/${id}/context-questions`, this.client.baseUrl);
    return this.request<ContextQuestion[]>('GET', url.toString()) as Promise<ContextQuestion[]>;
  }

  // POST /api/v1/hunts/{id}/context-questions/{questionId}
  async answerHuntContextQuestion(id: number, questionId: number, answer: string): Promise<ContextQuestion> {
    const url = new URL(`/api/v1/hunts/${id}/context-questions/${questionId}`, this.client.baseUrl);
    return this.request<ContextQuestion>('POST', url.toString(), { answer }) as Promise<ContextQuestion>;
  }
}

// ─── CLIENT CLASS ─────────────────────────────────────────────────────────────

export class ScrubinClient {
  public authStore: AuthStore;
  public portal: PortalResource;
  public company: CompanyResource;
  public hunt: HuntResource;

  constructor(public baseUrl: string) {
    this.authStore = new AuthStore();
    this.portal = new PortalResource(this);
    this.company = new CompanyResource(this);
    this.hunt = new HuntResource(this);
  }

  public async ensureAuth(): Promise<boolean> {
    // Add a buffer time (e.g., 60 seconds) to refresh before actual expiration
    const shouldRefresh = () => {
      if (!this.authStore.token) return false;
      try {
        const payload = this.authStore.model;
        if (!payload) return false;
        
        // Refresh if token expires in less than 60 seconds
        const expiresAt = new Date(payload.exp * 1000);
        const now = new Date();
        const bufferTime = 60 * 1000; // 60 seconds in milliseconds
        
        return expiresAt.getTime() - now.getTime() < bufferTime;
      } catch {
        return false;
      }
    };

    // If token is invalid or about to expire, refresh it
    if (!this.authStore.isValid || shouldRefresh()) {
      try {
        await this.authStore.refresh(this.baseUrl);
      } catch (error) {
        console.error("Token refresh failed:", error);
        return false;
      }
    }
    
    return !!this.authStore.token;
  }

  async authWithPassword(email: string, password: string): Promise<AuthResponse> {
    const headers: Record<string, string> = {
      'Origin': PUBLIC_ORIGIN,
      'Content-Type': 'application/json',
      'Accept': '*/*'
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/login/password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Authentication failed');
        } else {
          throw new Error('Authentication failed - invalid response format');
        }
      }
      const data: AuthResponse = await response.json();
      this.authStore.setRefreshToken(data.refresh_token);
      this.authStore.setAccessToken(data.access_token);

      if (typeof document !== 'undefined') {
        document.cookie = `scrubin_auth=${JSON.stringify({ jwt: data.access_token, refresh: data.refresh_token })}; path=/; SameSite=Strict`;
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Authentication failed');
    }
  }

  async authWithToken(token: string): Promise<AuthResponse> {
    const headers: Record<string, string> = {
      'Origin': PUBLIC_ORIGIN,
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'Authorization': `Bearer ${token}`
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/token`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Token authentication failed');
        } else {
          throw new Error('Token authentication failed - invalid response format');
        }
      }
      
      const data: AuthResponse = await response.json();
      this.authStore.setRefreshToken(data.refresh_token);
      this.authStore.setAccessToken(data.access_token);

      if (typeof document !== 'undefined') {
        document.cookie = `scrubin_auth=${JSON.stringify({ jwt: data.access_token, refresh: data.refresh_token })}; path=/; SameSite=Strict`;
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Token authentication failed');
    }
  }

  async signupWithPassword(payload: SignupPayload): Promise<AuthResponse> {
    const headers: Record<string, string> = {
      'Origin': PUBLIC_ORIGIN,
      'Content-Type': 'application/json',
      'Accept': '*/*'
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/signup/password`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Signup failed');
        } else {
          throw new Error('Signup failed - invalid response format');
        }
      }

      const data: AuthResponse = await response.json();
      this.authStore.setRefreshToken(data.refresh_token);
      this.authStore.setAccessToken(data.access_token);

      if (typeof document !== 'undefined') {
        document.cookie = `scrubin_auth=${JSON.stringify({ jwt: data.access_token, refresh: data.refresh_token })}; path=/; SameSite=Strict`;
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Signup failed');
    }
  }

  async signupCompanyWithEmail(payload: SignupCompanyPayload): Promise<AuthResponse> {
    const headers: Record<string, string> = {
      'Origin': PUBLIC_ORIGIN,
      'Content-Type': 'application/json',
      'Accept': '*/*'
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/signup/email/company`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.log(response);
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Company signup failed');
        } else {
          throw new Error('Company signup failed - invalid response format');
        }
      }

      const data: AuthResponse = await response.json();
      this.authStore.setRefreshToken(data.refresh_token);
      this.authStore.setAccessToken(data.access_token);

      if (typeof document !== 'undefined') {
        document.cookie = `scrubin_auth=${JSON.stringify({ jwt: data.access_token, refresh: data.refresh_token })}; path=/; SameSite=Strict`;
      }


      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Company signup failed');
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Origin': PUBLIC_ORIGIN,
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      body: JSON.stringify({ email })
    });
  }

  async setNewPassword(token: string, newPassword: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Origin': PUBLIC_ORIGIN,
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      body: JSON.stringify({ token, newPassword })
    });
  }
}

// ─── EXAMPLE USAGE ─────────────────────────────────────────────────────────────
// const scrubin = new ScrubinClient('https://api.test.scrubin.io');
// await scrubin.authWithPassword('email', 'password');
// const user = await scrubin.portal.getUser();
// const workerLookups = await scrubin.hunt.getWorkerLookups();
// const analyzeResult = await scrubin.hunt.analyzeWorkerLookups("Some description");
// const reqAnalyze = await scrubin.hunt.analyzeRequirements(1, "Job requirements text");
// const updatedReq = await scrubin.hunt.updateRequirements(1, 1, "Updated job requirements");
// const companyProfile = await scrubin.company.getCompany();
