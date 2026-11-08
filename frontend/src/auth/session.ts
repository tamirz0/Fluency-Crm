                                                                                                                                                                                                                                                          export const SESSION_KEY = 'fluency.auth.user.v1'
// Retira datos de la primera entrega; la identidad actual vive sólo en memoria.
export function clearSession() { sessionStorage.removeItem(SESSION_KEY) }
