import PreisfuchsData
import SwiftUI

/// Shared email-OTP entry point for profile and price reports.
struct LoginScreen: View {
    let account: AccountModel
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var code = ""
    @State private var sentTo: String?

    var body: some View {
        Form {
            if !account.isAvailable {
                Text("Die Anmeldung ist im Demo-Modus nicht verfügbar. Dafür wird eine konfigurierte Verbindung zu Korbwert benötigt.")
                    .accessibilityIdentifier("login.unavailable")
            } else if let user = account.user {
                Text("Angemeldet als \(user.email ?? "E-Mail-Konto")")
                Button("Zurück") { dismiss() }
            } else {
                Section {
                    Text("Zum Senden einer Nutzermeldung brauchst du eine Anmeldung per E-Mail-Code.")
                    if let sentTo {
                        Text("Code gesendet an \(sentTo). Gib die sechs Ziffern aus der E-Mail ein.")
                        TextField("Genau 6 Ziffern", text: $code)
                            .keyboardType(.numberPad)
                            .textContentType(.oneTimeCode)
                            .accessibilityIdentifier("login.code")
                        Button("Anmelden") {
                            Task {
                                if await account.verify(email: sentTo, code: code) { dismiss() }
                            }
                        }
                        .disabled(!LoginInput.isValidCode(code))
                        .accessibilityIdentifier("login.verify")
                        Button("Neuen Code senden") {
                            Task { _ = await account.sendCode(to: sentTo) }
                        }
                        Button("Andere E-Mail verwenden") {
                            self.sentTo = nil
                            code = ""
                        }
                    } else {
                        TextField("E-Mail-Adresse", text: $email)
                            .keyboardType(.emailAddress)
                            .textContentType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .accessibilityIdentifier("login.email")
                        Button("Code senden") {
                            guard let normalized = LoginInput.normalizedEmail(email) else { return }
                            Task {
                                if await account.sendCode(to: normalized) { sentTo = normalized }
                            }
                        }
                        .disabled(LoginInput.normalizedEmail(email) == nil)
                        .accessibilityIdentifier("login.sendCode")
                    }
                }
                .disabled(account.isWorking)
                if account.isWorking { ProgressView("Anmeldung läuft …") }
                if let message = account.message { Text(message).foregroundStyle(.red) }
            }
        }
        .navigationTitle("Mit E-Mail anmelden")
        .navigationBarTitleDisplayMode(.inline)
    }
}
