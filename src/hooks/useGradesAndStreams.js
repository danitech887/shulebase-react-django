import { useState, useEffect, useMemo } from 'react';

// Depending on where this is used, the alias might be 'students' or 'api'
// Here we assume it will be passed the axios instance
export function useGradesAndStreams(apiInstance, selectedGrade) {
  const [mapping, setMapping] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    // Use the comprehensive mapping endpoint
    apiInstance.get('grades-streams/')
      .then(res => {
        if (isMounted) {
          setMapping(res.data || {});
        }
      })
      .catch(err => console.error("Failed to load grades and streams mapping", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    
    return () => { isMounted = false; };
  }, [apiInstance]);

  const grades = useMemo(() => Object.keys(mapping).sort(), [mapping]);
  
  const streams = useMemo(() => {
    if (!selectedGrade || !mapping[selectedGrade]) return [];
    return mapping[selectedGrade];
  }, [mapping, selectedGrade]);

  return { grades, streams, loading };
}
