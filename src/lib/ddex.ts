import type { Work, Collaborator } from "./catalog";

export type DdexContext = {
  work: Work;
  collaborators: Collaborator[];
  labelName?: string | null;
  labelId?: string | null;
};

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isoNow(): string {
  return new Date().toISOString();
}

const WRITER_RE = /compositor|writer|autor/i;
const PERFORMER_RE = /artista|featuring|músico|musico/i;
const PRODUCER_RE = /productor|beatmaker/i;
const ENGINEER_RE = /ingenier/i;

function ddexRole(role: string): string {
  if (WRITER_RE.test(role)) return "Composer";
  if (PRODUCER_RE.test(role)) return "Producer";
  if (ENGINEER_RE.test(role)) return "Engineer";
  if (PERFORMER_RE.test(role)) return "MainArtist";
  return "Contributor";
}

/**
 * Generador DDEX ERN 4.3 (NewReleaseMessage) para entrega a distribuidores
 * compatibles. Emite un mensaje de una sola pista (SingleResourceRelease)
 * con recurso sonoro, contribuyentes y detalles de release.
 */
export function buildERN(ctx: DdexContext): string {
  const { work, collaborators } = ctx;
  const mainArtist =
    collaborators.find((c) => /artista principal/i.test(c.role))?.name ??
    collaborators.find((c) => PERFORMER_RE.test(c.role))?.name ??
    "Unknown Artist";
  const isrc = (work.isrc ?? "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const label = ctx.labelName ?? "Independent";
  const year = new Date(work.created_at).getFullYear();

  const contributors = collaborators
    .map(
      (c, i) => `        <ResourceContributor SequenceNumber="${i + 1}">
          <PartyName><FullName>${esc(c.name)}</FullName></PartyName>
          <ResourceContributorRole>${ddexRole(c.role)}</ResourceContributorRole>
        </ResourceContributor>`,
    )
    .join("\n");

  const writers = collaborators
    .filter((c) => WRITER_RE.test(c.role))
    .map(
      (c, i) => `        <IndirectResourceContributor SequenceNumber="${i + 1}">
          <PartyName><FullName>${esc(c.name)}</FullName></PartyName>
          <IndirectResourceContributorRole>Composer</IndirectResourceContributorRole>
          <RightSharePercentage>${Number(c.split_percent).toFixed(2)}</RightSharePercentage>
        </IndirectResourceContributor>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43" MessageSchemaVersionId="ern/43" LanguageAndScriptCode="es">
  <MessageHeader>
    <MessageThreadId>${esc(work.fingerprint)}</MessageThreadId>
    <MessageId>${esc(work.fingerprint)}-${Date.now()}</MessageId>
    <MessageSender>
      <PartyName><FullName>${esc(label)}</FullName></PartyName>
    </MessageSender>
    <MessageRecipient>
      <PartyName><FullName>Distributor</FullName></PartyName>
    </MessageRecipient>
    <MessageCreatedDateTime>${isoNow()}</MessageCreatedDateTime>
  </MessageHeader>
  <ReleaseAdmin>
    <ReleaseAdminId>${esc(work.fingerprint)}</ReleaseAdminId>
  </ReleaseAdmin>
  <ResourceList>
    <SoundRecording>
      <ResourceReference>A1</ResourceReference>
      <Type>MusicalWorkSoundRecording</Type>
      <ResourceId>
        <ISRC>${esc(isrc)}</ISRC>
        <ProprietaryId Namespace="CST">${esc(work.fingerprint)}</ProprietaryId>
      </ResourceId>
      <DisplayTitle><TitleText>${esc(work.title)}</TitleText></DisplayTitle>
      <DisplayArtistName>${esc(mainArtist)}</DisplayArtistName>
      <Contributor>
${contributors || "        <!-- sin contribuyentes registrados -->"}
      </Contributor>
      <IndirectContributor>
${writers || "        <!-- sin compositores registrados -->"}
      </IndirectContributor>
      <MusicalWork>
        <MusicalWorkId>
          <ISWC>${esc(work.iswc ?? "")}</ISWC>
        </MusicalWorkId>
      </MusicalWork>
      <Genre><GenreText>${esc(work.genre ?? "")}</GenreText></Genre>
      <SoundRecordingEdition>
        <TechnicalDetails>
          <TechnicalResourceDetailsReference>T1</TechnicalResourceDetailsReference>
        </TechnicalDetails>
      </SoundRecordingEdition>
    </SoundRecording>
  </ResourceList>
  <ReleaseList>
    <Release>
      <ReleaseReference>R0</ReleaseReference>
      <ReleaseId>
        <ProprietaryId Namespace="CST">${esc(work.fingerprint)}</ProprietaryId>
      </ReleaseId>
      <DisplayTitleText>${esc(work.title)}</DisplayTitleText>
      <DisplayArtistName>${esc(mainArtist)}</DisplayArtistName>
      <ReleaseType>Single</ReleaseType>
      <PLine><Year>${year}</Year><PLineText>${year} ${esc(label)}</PLineText></PLine>
      <CLine><Year>${year}</Year><CLineText>${year} ${esc(label)}</CLineText></CLine>
      <ResourceGroup>
        <ResourceGroupContentItem>
          <ReleaseResourceReference>A1</ReleaseResourceReference>
        </ResourceGroupContentItem>
      </ResourceGroup>
    </Release>
  </ReleaseList>
  <DealList>
    <ReleaseDeal>
      <DealReleaseReference>R0</DealReleaseReference>
      <Deal>
        <DealTerms>
          <CommercialModelType>SubscriptionModel</CommercialModelType>
          <UseType>OnDemandStream</UseType>
          <TerritoryCode>Worldwide</TerritoryCode>
        </DealTerms>
      </Deal>
    </ReleaseDeal>
  </DealList>
</ern:NewReleaseMessage>`;
}

export type DdexIssue = { level: "error" | "warning"; message: string };

/** Validación mínima previa a entregar el ERN a un distribuidor. */
export function validateForDdex(ctx: DdexContext): DdexIssue[] {
  const issues: DdexIssue[] = [];
  const { work, collaborators } = ctx;
  if (!work.isrc) issues.push({ level: "error", message: "Falta ISRC (obligatorio en DDEX)." });
  if (!collaborators.some((c) => /artista principal|featuring/i.test(c.role)))
    issues.push({ level: "error", message: "Falta artista principal." });
  if (!collaborators.some((c) => WRITER_RE.test(c.role)))
    issues.push({ level: "warning", message: "Sin compositores acreditados." });
  if (!work.iswc) issues.push({ level: "warning", message: "Sin ISWC de la composición." });
  if (!work.genre) issues.push({ level: "warning", message: "Sin género." });
  if (!work.cover_path) issues.push({ level: "warning", message: "Sin carátula asociada." });
  return issues;
}
