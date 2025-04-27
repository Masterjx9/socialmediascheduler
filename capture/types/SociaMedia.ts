
export interface SocialMediaAccount {
    provider_user_id: string;  
    provider_name: string;
}

export interface HandleNewSignUpParams {
    provider: string;
    GoogleSignin?: any; 
    setIsAccountsVisible: (visible: boolean) => void; 
    setIsNewAccountVisible: (visible: boolean) => void; 
    setIsCalendarVisible: (visible: boolean) => void;
    setIsLoginVisible: (visible: boolean) => void;
    setAccounts: React.Dispatch<React.SetStateAction<SocialMediaAccount[]>>; 
}
