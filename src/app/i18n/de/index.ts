import type { BaseTranslation } from "../i18n-types";

const de = {
  common: {
    actions: {
      close: "Schließen",
      deleteOwnPhoto: "Mein Foto löschen",
      downloadPhoto: "Foto herunterladen",
      join: "Beitreten",
      retry: "Erneut versuchen",
    },
    labels: {
      english: "English",
      german: "Deutsch",
      language: "Sprache",
      name: "Name",
    },
    messages: {
      challengePhotoAlt: "Challenge-Foto: {caption:string}",
      enterName: "Bitte gib deinen Namen ein.",
      enterNameBeforeUpload:
        "Bitte gib deinen Namen ein, bevor du Fotos hochlädst.",
      photoBy: "Foto von {uploadedBy:string}",
      uploadFailed: "Upload fehlgeschlagen.",
    },
    placeholders: {
      name: "Gib deinen Namen ein",
    },
    views: {
      challenges: "Challenges",
      photos: "Fotogalerie",
      settings: "Einstellungen",
    },
  },
  settings: {
    archiveDescription:
      "Lade alle Bilder aus der Galerie gemeinsam als ZIP-Datei herunter.",
    archiveDownload: "Alle Fotos herunterladen",
    archiveEmpty: "Es gibt noch keine Fotos zum Herunterladen.",
    archiveEmptyDownload: "Noch keine Fotos zum Herunterladen",
    archiveError: "Der Download konnte nicht geladen werden.",
    archivePreparing:
      "Das Archiv mit {imageCount:number} Bildern wird vorbereitet …",
    archiveSummary:
      "{imageCount:number} Bilder · {downloadSize:string} Download",
    archiveTitle: "Alle Fotos",
    languageDescription:
      "Wähle die Sprache aus, in der die Anwendung angezeigt werden soll.",
    nameDescription:
      "Dein Name personalisiert das Erlebnis und hilft dabei, dich in der Galerie zuzuordnen. Er ist für andere Gäste sichtbar.",
  },
  photos: {
    gallery: {
      emptyDescription:
        "Tippe auf das Plus und wähle ein oder mehrere Bilder aus, um die Galerie zu füllen.",
      emptyTitle: "Noch keine Fotos.",
      endReached: "Alle Fotos geladen.",
      loadErrorTitle: "Fotos konnten nicht geladen werden.",
    },
    uploadButtonAriaLabel: "Fotos hochladen",
  },
  challenges: {
    difficulty: {
      easy: "Einfach",
      extreme: "Extrem",
      hard: "Schwer",
      medium: "Mittel",
    },
    solvedState: {
      catchUp: "Hol auf",
      first: "Sei der Erste",
      keepUp: "Halte mit",
      locked: "Schon voll",
    },
  },
  uploadStatus: {
    completeTitle: "Upload abgeschlossen",
    failedTitle: "Einige Uploads sind fehlgeschlagen",
    subtitleCompleted:
      "{completedCount:number} von {totalCount:number} hochgeladen",
    subtitleWithFailures:
      "{completedCount:number} von {totalCount:number} hochgeladen, {failedCount:number} fehlgeschlagen",
    uploadingTitle: "Lade {count:number} Foto{{count:s}} hoch",
  },
  errors: {
    challengeAlreadyCompleted: "Du hast diese Challenge bereits abgeschlossen.",
    challengeLocked:
      "Diese Challenge ist voll. Wenn jemand sein Foto löscht, wird wieder ein Platz frei.",
    challengeStatsLoadFailed:
      "Die Challenge-Statistiken konnten nicht geladen werden.",
    deletePhotoNotAllowed:
      "Dieser Browser hat den Löschschlüssel für dieses Foto nicht mehr.",
    emptyPhotoFile: "Die Fotodatei ist leer.",
    generic: "Etwas ist schiefgelaufen.",
    imageUploadsOnly: "Es können nur Bilder hochgeladen werden.",
    photoFileRequired: "Bitte wähle ein Foto aus.",
    photoStoreFailed: "Das Foto konnte nicht gespeichert werden.",
    requestFailed: "Die Anfrage konnte nicht abgeschlossen werden.",
    uploadedByRequired: "Bitte gib deinen Namen an.",
    userIdRequired:
      "Die Anfrage konnte nicht deinem Benutzer zugeordnet werden.",
    userIdRequiredForChallengeUpload:
      "Für Challenge-Uploads wird eine Benutzerkennung benötigt.",
  },
} satisfies BaseTranslation;

export default de;
