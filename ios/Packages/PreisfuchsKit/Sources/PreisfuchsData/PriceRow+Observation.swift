import Foundation
import PreisfuchsDomain

public extension PriceObservation {
    init(row: PriceRow) {
        let sourceName = row.source == "Preisfuchs Nutzermeldung" ? "Community" : (row.source ?? "Unbekannte Quelle")
        let sourceDetail = row.sourceLicense ?? row.sourceUrl ?? sourceName

        self.init(
            id: row.id.uuidString,
            retailer: row.retailerName,
            storeLocation: row.locationLabel ?? row.region ?? "Deutschland",
            price: row.price,
            unitPrice: row.unitPrice,
            unit: row.unit,
            observedAt: row.observedAt,
            source: sourceName,
            sourceDetail: sourceDetail,
            confidence: row.confidence ?? 0,
            offerType: row.offerType,
            requiresApp: row.requiresApp,
            appName: row.appName,
            couponActivationRequired: row.couponActivationRequired,
            personalized: row.isPersonalized,
            regularPrice: row.regularPrice,
            validFrom: row.validFrom,
            validUntil: row.validUntil,
            discountDescription: row.discountDescription
        )
    }
}
