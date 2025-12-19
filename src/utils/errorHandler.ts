/**
 * Utilitaire pour parser et formater les erreurs du backend
 */

export interface ParsedErrors {
  fieldErrors: Record<string, string>;
  generalError: string | null;
}

/**
 * Parse les erreurs du backend FastAPI/SQLAlchemy et retourne un format structuré
 */
export function parseErrors(error: any): ParsedErrors {
  const fieldErrors: Record<string, string> = {};
  let generalError: string | null = null;

  if (error.response?.data) {
    const errorData = error.response.data;
    const errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
    
    // Détecter les erreurs d'intégrité (duplication, contraintes UNIQUE)
    const lowerMessage = errorMessage.toLowerCase();
    
    // Erreur de code-barres dupliqué
    if (lowerMessage.includes('barcode') && (lowerMessage.includes('unique') || lowerMessage.includes('duplicate') || lowerMessage.includes('already exists') || lowerMessage.includes('déjà'))) {
      fieldErrors.barcode = 'Ce code-barres existe déjà. Veuillez en utiliser un autre.';
    }
    // Erreur de SKU dupliqué
    else if (lowerMessage.includes('sku') && (lowerMessage.includes('unique') || lowerMessage.includes('duplicate') || lowerMessage.includes('already exists') || lowerMessage.includes('déjà'))) {
      fieldErrors.sku = 'Ce SKU existe déjà. Veuillez en utiliser un autre.';
    }
    // Erreur d'email dupliqué
    else if (lowerMessage.includes('email') && (lowerMessage.includes('unique') || lowerMessage.includes('duplicate') || lowerMessage.includes('already exists') || lowerMessage.includes('déjà'))) {
      fieldErrors.email = 'Cet email existe déjà. Veuillez en utiliser un autre.';
    }
    // Erreur de nom d'utilisateur dupliqué
    else if (lowerMessage.includes('username') && (lowerMessage.includes('unique') || lowerMessage.includes('duplicate') || lowerMessage.includes('already exists') || lowerMessage.includes('déjà'))) {
      fieldErrors.username = 'Ce nom d\'utilisateur existe déjà. Veuillez en utiliser un autre.';
    }
    // Erreur de téléphone dupliqué
    else if (lowerMessage.includes('phone') && (lowerMessage.includes('unique') || lowerMessage.includes('duplicate') || lowerMessage.includes('already exists') || lowerMessage.includes('déjà'))) {
      fieldErrors.phone = 'Ce numéro de téléphone existe déjà. Veuillez en utiliser un autre.';
    }
    // Erreur d'intégrité générale
    else if (lowerMessage.includes('unique constraint') || lowerMessage.includes('integrity') || lowerMessage.includes('intégrité')) {
      // Essayer d'identifier le champ concerné
      if (lowerMessage.includes('barcode')) {
        fieldErrors.barcode = 'Ce code-barres existe déjà. Veuillez en utiliser un autre.';
      } else if (lowerMessage.includes('sku')) {
        fieldErrors.sku = 'Ce SKU existe déjà. Veuillez en utiliser un autre.';
      } else if (lowerMessage.includes('email')) {
        fieldErrors.email = 'Cet email existe déjà. Veuillez en utiliser un autre.';
      } else if (lowerMessage.includes('username')) {
        fieldErrors.username = 'Ce nom d\'utilisateur existe déjà. Veuillez en utiliser un autre.';
      } else if (lowerMessage.includes('phone')) {
        fieldErrors.phone = 'Ce numéro de téléphone existe déjà. Veuillez en utiliser un autre.';
      } else {
        generalError = 'Cette valeur existe déjà dans la base de données. Veuillez vérifier les champs uniques.';
      }
    }
    // Erreurs de validation Pydantic (format FastAPI)
    else if (Array.isArray(errorData.detail)) {
      errorData.detail.forEach((err: any) => {
        if (err.loc && err.loc.length > 1) {
          const field = err.loc[err.loc.length - 1];
          // Traduire les messages d'erreur courants
          let message = err.msg;
          if (message.includes('already exists') || message.includes('duplicate')) {
            if (field === 'barcode') {
              message = 'Ce code-barres existe déjà. Veuillez en utiliser un autre.';
            } else if (field === 'sku') {
              message = 'Ce SKU existe déjà. Veuillez en utiliser un autre.';
            } else if (field === 'email') {
              message = 'Cet email existe déjà. Veuillez en utiliser un autre.';
            } else if (field === 'username') {
              message = 'Ce nom d\'utilisateur existe déjà. Veuillez en utiliser un autre.';
            } else if (field === 'phone') {
              message = 'Ce numéro de téléphone existe déjà. Veuillez en utiliser un autre.';
            }
          }
          fieldErrors[field] = message;
        } else {
          generalError = err.msg || generalError;
        }
      });
    } else if (typeof errorData.detail === 'string') {
      // Erreur simple - vérifier si c'est une erreur d'intégrité
      if (errorData.detail.includes('intégrité') || errorData.detail.includes('integrity')) {
        generalError = 'Cette valeur existe déjà. Veuillez vérifier les champs uniques.';
      } else {
        generalError = errorData.detail;
      }
    } else if (typeof errorData.detail === 'object') {
      // Erreurs par champ
      Object.keys(errorData.detail).forEach((key) => {
        const value = errorData.detail[key];
        if (Array.isArray(value)) {
          let message = value[0];
          // Traduire les messages de duplication
          if (message.includes('already exists') || message.includes('duplicate')) {
            if (key === 'barcode') {
              message = 'Ce code-barres existe déjà. Veuillez en utiliser un autre.';
            } else if (key === 'sku') {
              message = 'Ce SKU existe déjà. Veuillez en utiliser un autre.';
            } else if (key === 'email') {
              message = 'Cet email existe déjà. Veuillez en utiliser un autre.';
            } else if (key === 'username') {
              message = 'Ce nom d\'utilisateur existe déjà. Veuillez en utiliser un autre.';
            } else if (key === 'phone') {
              message = 'Ce numéro de téléphone existe déjà. Veuillez en utiliser un autre.';
            }
          }
          fieldErrors[key] = message;
        } else if (typeof value === 'string') {
          let message = value;
          if (message.includes('already exists') || message.includes('duplicate')) {
            if (key === 'barcode') {
              message = 'Ce code-barres existe déjà. Veuillez en utiliser un autre.';
            } else if (key === 'sku') {
              message = 'Ce SKU existe déjà. Veuillez en utiliser un autre.';
            } else if (key === 'email') {
              message = 'Cet email existe déjà. Veuillez en utiliser un autre.';
            } else if (key === 'username') {
              message = 'Ce nom d\'utilisateur existe déjà. Veuillez en utiliser un autre.';
            } else if (key === 'phone') {
              message = 'Ce numéro de téléphone existe déjà. Veuillez en utiliser un autre.';
            }
          }
          fieldErrors[key] = message;
        }
      });
    }
  }

  // Si aucune erreur spécifique, message générique
  if (Object.keys(fieldErrors).length === 0 && !generalError) {
    const errorMessage = error.message || '';
    if (errorMessage.toLowerCase().includes('unique') || errorMessage.toLowerCase().includes('duplicate')) {
      generalError = 'Cette valeur existe déjà. Veuillez vérifier les champs uniques.';
    } else {
      generalError = 'Une erreur est survenue. Veuillez réessayer.';
    }
  }

  return { fieldErrors, generalError };
}

/**
 * Scroll vers le haut du modal pour afficher les erreurs
 */
export function scrollToTop() {
  const modalContent = document.querySelector('.modal-content');
  if (modalContent) {
    modalContent.scrollTop = 0;
  }
}

