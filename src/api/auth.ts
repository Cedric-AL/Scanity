export type LoginCredentials = {
  identifier: string
  password: string
}

export type RegisterData = {
  name: string
  email: string
  password: string
}

export async function loginUser(
  credentials: LoginCredentials,
) {
  // Waiting for backend authentication API.
  // Do not fake a successful login.
  throw new Error("AUTH_API_NOT_READY")
}

export async function registerUser(
  data: RegisterData,
) {
  // Waiting for backend authentication API.
  // Do not fake a successful registration.
  throw new Error("AUTH_API_NOT_READY")
}