import PreisfuchsDomain
import SwiftUI

struct LocationButton: View {
    @AppStorage(LocationPreference.postalCodeKey) private var postalCode = ""
    @AppStorage(LocationPreference.radiusKey) private var radiusKM = 10.0
    @State private var showsLocation = false

    var body: some View {
        Button { showsLocation = true } label: {
            Label(postalCode.isEmpty ? "Standort wählen" : "\(postalCode) · \(Int(radiusKM)) km", systemImage: "mappin.and.ellipse")
                .font(.subheadline.weight(.semibold)).frame(minHeight: 44)
        }
        .accessibilityIdentifier("location.open")
        .sheet(isPresented: $showsLocation) { LocationSheet() }
    }
}

struct LocationSheet: View {
    @AppStorage(LocationPreference.postalCodeKey) private var savedPostalCode = ""
    @AppStorage(LocationPreference.radiusKey) private var savedRadiusKM = 10.0
    @State private var postalCode = ""
    @State private var radiusKM = 10.0
    @Environment(\.dismiss) private var dismiss

    private var preference: LocationPreference? { LocationPreference(postalCode: postalCode, radiusKM: radiusKM) }

    var body: some View {
        NavigationStack {
            Form {
                Section("Postleitzahl") {
                    TextField("Genau 5 Ziffern", text: $postalCode)
                        .keyboardType(.numberPad)
                        .textContentType(.postalCode)
                        .accessibilityIdentifier("location.postalCode")
                    if !postalCode.isEmpty && !LocationPreference.isValidPostalCode(postalCode) {
                        Text("Bitte genau 5 Ziffern eingeben.").foregroundStyle(.red)
                    }
                }
                Section("Suchradius: \(Int(radiusKM)) km") {
                    Slider(value: $radiusKM, in: 1...100, step: 1)
                        .accessibilityLabel("Suchradius in Kilometern")
                }
                Section {
                    Text("Korbwert speichert deine Auswahl auf diesem Gerät. Eine Entfernungsfilterung ist noch nicht angebunden; die Übersicht zeigt weiterhin Beobachtungen aus ganz Deutschland.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Standort")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Abbrechen") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Speichern") {
                        guard let preference else { return }
                        savedPostalCode = preference.postalCode
                        savedRadiusKM = preference.radiusKM
                        dismiss()
                    }
                    .disabled(preference == nil)
                    .accessibilityIdentifier("location.save")
                }
            }
        }
        .onAppear {
            postalCode = savedPostalCode
            radiusKM = savedRadiusKM
        }
        .presentationDetents([.medium, .large])
    }
}
