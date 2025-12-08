import Modal from '@/components/ui/Modal';
import { Prescription, PrescriptionStatus } from '@/types/prescription';
import { FileText, Calendar, User, Clock } from 'lucide-react';
import clsx from 'clsx';

interface PrescriptionDetailsModalProps {
  prescription: Prescription;
  onClose: () => void;
}

const STATUS_LABELS: Record<PrescriptionStatus, string> = {
  [PrescriptionStatus.ACTIVE]: 'Active',
  [PrescriptionStatus.USED]: 'Utilisée',
  [PrescriptionStatus.PARTIALLY_USED]: 'Partiellement utilisée',
  [PrescriptionStatus.EXPIRED]: 'Expirée',
  [PrescriptionStatus.CANCELLED]: 'Annulée',
};

const STATUS_COLORS: Record<PrescriptionStatus, string> = {
  [PrescriptionStatus.ACTIVE]: 'bg-green-100 text-green-800 border-green-200',
  [PrescriptionStatus.USED]: 'bg-blue-100 text-blue-800 border-blue-200',
  [PrescriptionStatus.PARTIALLY_USED]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [PrescriptionStatus.EXPIRED]: 'bg-red-100 text-red-800 border-red-200',
  [PrescriptionStatus.CANCELLED]: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function PrescriptionDetailsModal({
  prescription,
  onClose,
}: PrescriptionDetailsModalProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Prescription ${prescription.prescription_number}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* En-tête avec statut */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 font-mono">
                {prescription.prescription_number}
              </h3>
              <p className="text-sm text-gray-500">
                Créée le {formatDateTime(prescription.created_at)}
              </p>
            </div>
          </div>
          <span className={clsx(
            'badge text-xs font-semibold border',
            STATUS_COLORS[prescription.status]
          )}>
            {STATUS_LABELS[prescription.status]}
          </span>
        </div>

        {/* Informations client */}
        <div className="card p-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-600" />
            Client
          </h4>
          <div className="space-y-1 text-sm">
            <p className="font-medium">
              {prescription.customer?.first_name} {prescription.customer?.last_name}
            </p>
            {prescription.customer?.phone && (
              <p className="text-gray-600">📞 {prescription.customer.phone}</p>
            )}
            {prescription.customer?.email && (
              <p className="text-gray-600">✉️ {prescription.customer.email}</p>
            )}
          </div>
        </div>

        {/* Informations médecin */}
        <div className="card p-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-600" />
            Médecin
          </h4>
          <div className="space-y-1 text-sm">
            <p className="font-medium">{prescription.doctor_name}</p>
            {prescription.doctor_specialty && (
              <p className="text-gray-600">Spécialité: {prescription.doctor_specialty}</p>
            )}
            {prescription.doctor_license_number && (
              <p className="text-gray-600">N° Licence: {prescription.doctor_license_number}</p>
            )}
            {prescription.doctor_phone && (
              <p className="text-gray-600">📞 {prescription.doctor_phone}</p>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              <h4 className="font-semibold text-gray-900">Date de prescription</h4>
            </div>
            <p className="text-sm text-gray-600">{formatDate(prescription.prescription_date)}</p>
          </div>
          {prescription.expiry_date && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-primary-600" />
                <h4 className="font-semibold text-gray-900">Date d'expiration</h4>
              </div>
              <p className="text-sm text-gray-600">{formatDate(prescription.expiry_date)}</p>
            </div>
          )}
        </div>

        {/* Diagnostic */}
        {prescription.diagnosis && (
          <div className="card p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Diagnostic / Motif</h4>
            <p className="text-sm text-gray-600">{prescription.diagnosis}</p>
          </div>
        )}

        {/* Produits prescrits */}
        <div className="card p-4">
          <h4 className="font-semibold text-gray-900 mb-4">
            Produits prescrits ({prescription.items.length})
          </h4>
          <div className="space-y-4">
            {prescription.items.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">
                      {item.product?.name || `Produit #${item.product_id}`}
                    </h5>
                    {item.product?.barcode && (
                      <p className="text-xs text-gray-500">Code: {item.product.barcode}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {item.quantity_used} / {item.quantity_prescribed}
                    </div>
                    <div className="text-xs text-gray-500">utilisé / prescrit</div>
                  </div>
                </div>

                {item.dosage && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-gray-700">Posologie: </span>
                    <span className="text-xs text-gray-600">{item.dosage}</span>
                  </div>
                )}

                {item.duration && (
                  <div className="mt-1">
                    <span className="text-xs font-medium text-gray-700">Durée: </span>
                    <span className="text-xs text-gray-600">{item.duration}</span>
                  </div>
                )}

                {item.instructions && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                    {item.instructions}
                  </div>
                )}

                {item.notes && (
                  <div className="mt-2 text-xs text-gray-500 italic">
                    Note: {item.notes}
                  </div>
                )}

                {/* Barre de progression */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={clsx(
                        'h-2 rounded-full transition-all',
                        item.quantity_used >= item.quantity_prescribed
                          ? 'bg-green-500'
                          : item.quantity_used > 0
                          ? 'bg-yellow-500'
                          : 'bg-gray-300'
                      )}
                      style={{
                        width: `${Math.min(
                          (item.quantity_used / item.quantity_prescribed) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {prescription.notes && (
          <div className="card p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
            <p className="text-sm text-gray-600">{prescription.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t">
          <button onClick={onClose} className="btn-secondary">
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
}

