const normalizeStoredDomain = (value: string): string | null => {
  const trimmed = value.trim().toLowerCase().replace(/^\.+|\.+$/g, '')
  if (!trimmed) {
    return null
  }

  return trimmed.startsWith('www.') && trimmed.length > 4 ? trimmed.slice(4) : trimmed
}

const DOMAIN_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

const isValidHostname = (value: string): boolean => {
  if (!value || /\s/.test(value)) {
    return false
  }

  const labels = value.split('.')
  return labels.length > 0 && labels.every((label) => DOMAIN_LABEL_PATTERN.test(label))
}

const getHostnameCandidate = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (/\s/.test(trimmed)) {
    return null
  }

  if (trimmed.includes(':') && !trimmed.includes('://')) {
    return null
  }

  if (trimmed.includes('://')) {
    try {
      return new URL(trimmed).hostname
    } catch {
      return null
    }
  }

  try {
    return new URL(`https://${trimmed}`).hostname
  } catch {
    return null
  }
}

export const normalizeDistractingDomain = (value: string): string | null => {
  const normalized = normalizeStoredDomain(getHostnameCandidate(value) ?? '')
  return normalized !== null && isValidHostname(normalized) ? normalized : null
}

export const normalizeDistractingDomains = (values: readonly string[]): string[] => {
  const normalized = new Set<string>()

  for (const value of values) {
    const domain = normalizeDistractingDomain(value)
    if (domain !== null) {
      normalized.add(domain)
    }
  }

  return [...normalized]
}

export const domainMatches = (domain: string, candidate: string): boolean =>
  domain === candidate || domain.endsWith(`.${candidate}`)

export const domainMatchesList = (domain: string | null, candidates: readonly string[]): boolean => {
  if (domain === null) {
    return false
  }

  const normalizedDomain = normalizeDistractingDomain(domain)
  if (normalizedDomain === null) {
    return false
  }

  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeDistractingDomain(candidate)
    return normalizedCandidate !== null && domainMatches(normalizedDomain, normalizedCandidate)
  })
}
