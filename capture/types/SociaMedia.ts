
export interface SocialMediaAccount {
    provider_user_id: string;  
    provider_name: string;
}
export type LinkedInExpiryInfo = {
  id: string;           // provider_user_id  (sub_id)
  accountName: string;  // friendly LinkedIn account name
  expiresSoon: boolean; // true = already expired OR will expire within 48 h
};

export interface HandleNewSignUpParams {
    provider: string;
    GoogleSignin?: any; 
    setIsAccountsVisible: (visible: boolean) => void; 
    setIsNewAccountVisible: (visible: boolean) => void; 
    setIsCalendarVisible: (visible: boolean) => void;
    setIsLoginVisible: (visible: boolean) => void;
    setAccounts: React.Dispatch<React.SetStateAction<SocialMediaAccount[]>>; 
}
