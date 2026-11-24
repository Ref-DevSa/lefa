import { useApi } from '../../app/ApiContext.js'
import { useToast } from '../../components/ui/useToast.js'

/**
 * Open a private document in a new tab via a 60-second link.
 * The tab is opened immediately (inside the click) so pop-up blockers allow
 * it, then pointed at the link once the API returns it.
 */
export function useOpenDocument() {
  const api = useApi()
  const toast = useToast()
  return async (/** @type {Record<string, any>} */ doc) => {
    const tab = window.open('', '_blank')
    if (tab) tab.opener = null // the new page can't reach back into Lefa
    try {
      const url = await api.getDocumentUrl(doc.id)
      if (tab) tab.location.href = url
      else window.location.assign(url)
    } catch (err) {
      tab?.close()
      toast(/** @type {Error} */ (err).message || `Couldn't open ${doc.file_name}.`, 'error')
    }
  }
}
