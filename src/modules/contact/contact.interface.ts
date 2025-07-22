export interface ContactFormData {
    first_name: string;
    last_name: string;
    email: string;
    message: string;
}

export interface EmailResponse {
    success: boolean;
    message: string;
}