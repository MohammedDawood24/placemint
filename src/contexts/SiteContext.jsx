import { createContext, useContext } from 'react'
import { useDocument } from '../hooks/useFirestore'

const SiteContext = createContext({})

export function useSite() {
  return useContext(SiteContext)
}

export function SiteProvider({ children }) {
  const { data, loading } = useDocument('settings', 'site')

  const site = {
    loading,
    siteName: data?.ownerInfo?.collegeName || 'PlaceMint',
    cellName: data?.ownerInfo?.name || 'Placement Cell',
    email: data?.ownerInfo?.email || '',
    phone: data?.ownerInfo?.phone || '',
    website: data?.ownerInfo?.website || '',
    address: data?.ownerInfo?.address || '',
    privacyPolicy: data?.privacyPolicy || '',
    termsAndConditions: data?.termsAndConditions || '',
    faqs: data?.faqs || [],
    branches: data?.branches || [],
    raw: data,
  }

  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>
}
