export interface LoginBody {
	email: string;
	password: string;
}

export interface RegistrationBody {
	email: string;
	password: string;
	passwordConfirm: string;
	firstName: string;
	lastName: string;
	phone: string;
}

export interface ResetPasswordBody {
	email: string;
}
