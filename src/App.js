import { useState, useEffect } from 'react';
import './App.css';

/**
 * @typedef {object} ServiceRequest
 * @property {number} id
 * @property {string} description
 */

/**
 * @typedef {object} ArtistInfo
 * @property {number} id
 * @property {string} username
 * @property {string} email
 * @property {string} role
 * @property {boolean} enabled
 * @property {string} dateCreated
 */

/**
 * @typedef {object} SkillMatch
 * @property {number} skillId
 * @property {string} skillName
 * @property {string} requiredLevel
 * @property {string} priority
 * @property {string | null} artistLevel
 * @property {boolean} partialMatch
 * @property {boolean} perfectMatch
 */

/**
 * @typedef {object} MissingSkill
 * @property {number} [id]
 * @property {number} skillId
 * @property {string} skillName
 * @property {string} requiredLevel
 * @property {string} priority
 */

/**
 * @typedef {object} AssignmentProspect
 * @property {ArtistInfo} artistInfo
 * @property {SkillMatch[]} skillMatches
 * @property {MissingSkill[]} missingEssentialSkills
 * @property {MissingSkill[]} missingDesirableSkills
 * @property {number} currentActiveProjects
 * @property {number} overallMatchScore
 */

function App() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [assignmentProspects, setAssignmentProspects] = useState([]);
  const [approvedRequestId, setApprovedRequestId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [currentApprovedRequestDetails, setCurrentApprovedRequestDetails] = useState(null);

  const API_BASE_URL = 'https://core-4dme.onrender.com/api';

  const fetchPendingRequests = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/owner/service-requests?status=PENDING_APPROVAL`);
      if (!response.ok) {
        throw new Error(`Error HTTP obteniendo solicitudes pendientes: ${response.status}`);
      }
      const data = await response.json();
      setPendingRequests(data || []);
    } catch (e) {
      setError(e.message);
      setPendingRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const handleApproveRequest = async (requestToApprove) => {
    setIsApproving(true);
    setError(null);
    setSuccessMessage(null);
    setAssignmentProspects([]);
    setApprovedRequestId(null);
    setCurrentApprovedRequestDetails(null);

    try {
      const approveResponse = await fetch(`${API_BASE_URL}/owner/service-requests/${requestToApprove.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!approveResponse.ok) {
        const errorText = await approveResponse.text();
        throw new Error(`Falló la aprobación de la solicitud ${requestToApprove.id}: ${approveResponse.status} - ${errorText}`);
      }
      
      setApprovedRequestId(requestToApprove.id);
      setCurrentApprovedRequestDetails(requestToApprove);
      setPendingRequests(prev => prev.filter(req => req.id !== requestToApprove.id));
      setSuccessMessage(`Solicitud ${requestToApprove.id} aprobada exitosamente. Mostrando prospectos de asignación.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsApproving(false);
    }
  };

  useEffect(() => {
    if (!approvedRequestId) {
      setAssignmentProspects([]);
      return;
    }
    const fetchAssignmentProspects = async () => {
      setIsLoading(true); 
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/owner/service-requests/${approvedRequestId}/assignment-prospects`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error HTTP obteniendo prospectos de asignación para la solicitud ${approvedRequestId}: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        setAssignmentProspects(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message);
        setAssignmentProspects([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssignmentProspects();
  }, [approvedRequestId, API_BASE_URL]);

  const handleAssignArtist = async (requestId, artistId) => {
    setIsAssigning(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const assignResponse = await fetch(`${API_BASE_URL}/owner/service-requests/${requestId}/assign/${artistId}`, {
        method: 'PUT', // O 'POST', según tu API
        headers: {
          'Content-Type': 'application/json',
        },
        // body: JSON.stringify({ somePayload: 'ifNeeded' }) // Si tu API espera un cuerpo
      });

      if (!assignResponse.ok) {
        const errorText = await assignResponse.text();
        throw new Error(`Falló la asignación del artista ${artistId} a la solicitud ${requestId}: ${assignResponse.status} - ${errorText}`);
      }
      
      setSuccessMessage(`Artista ${artistId} asignado exitosamente a la solicitud ${requestId}.`);
      setAssignmentProspects([]); 
    } catch (e) {
      setError(e.message);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="App">
      <h1>Gestión de Solicitudes de Servicio</h1>

      {error && <p className="message error">Error: {error}</p>}
      {successMessage && <p className="message success">{successMessage}</p>}
      {(isLoading || isApproving || isAssigning) && !error && !successMessage && (
        <p className="message loading">
          {isApproving ? 'Aprobando solicitud...' : 
           isAssigning ? 'Asignando artista...' :
           isLoading ? 'Cargando datos...' : 'Procesando...'}
        </p>
      )}

      {!currentApprovedRequestDetails && !isApproving && !isAssigning && !error && (
        <section>
          <h2>Solicitudes Pendientes de Aprobación</h2>
          {isLoading && pendingRequests.length === 0 && <p>Cargando solicitudes pendientes...</p>}
          {!isLoading && pendingRequests.length === 0 && <p>No hay solicitudes pendientes de aprobación.</p>}
          {pendingRequests.length > 0 && (
            <ul>
              {pendingRequests.map((req) => (
                <li key={req.id}>
                  ID Solicitud: {req.id} - {req.description || 'Sin descripción'}
                  <button
                    onClick={() => handleApproveRequest(req)}
                    disabled={isApproving || isLoading}
                    style={{ marginLeft: '10px' }}
                  >
                    {isApproving ? 'Aprobando...' : 'Aprobar'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {currentApprovedRequestDetails && !error && (
          <section>
            <h2>Detalles de la Solicitud Aprobada</h2>
            <p>ID: {currentApprovedRequestDetails.id}</p>
            <p>Descripción: {currentApprovedRequestDetails.description || 'N/A'}</p>
          </section>
      )}

      {approvedRequestId && assignmentProspects.length > 0 && !error && !isAssigning && (
        <section>
          <h2>Prospectos de Asignación para Solicitud ID: {approvedRequestId}</h2>
          {isLoading && assignmentProspects.length === 0 && <p>Cargando prospectos de asignación...</p>}
          {assignmentProspects.length > 0 && (
            <ul>
              {assignmentProspects.map((prospect) => 
                prospect && prospect.artistInfo ? (
                  <li key={prospect.artistInfo.id}> 
                    Artista: {prospect.artistInfo.username || prospect.artistInfo.email || 'N/A'} (ID: {prospect.artistInfo.id})
                    <br />
                    {/* Comentario eliminado para evitar renderizar un objeto vacío {} */}
                    {prospect.overallMatchScore !== -1000 && (
                      <>
                        <br />
                        Puntuación General de Coincidencia: {prospect.overallMatchScore}
                      </>
                    )}
                    {prospect.skillMatches && prospect.skillMatches.length > 0 && (
                      <div className="skill-details-container" style={{marginTop: '5px', marginLeft: '15px'}}>
                        <strong>Coincidencias de Habilidades:</strong>
                        <ul>
                          {prospect.skillMatches.map(skill => 
                            skill ? (
                              <li key={skill.skillId}>
                                {skill.skillName} (Requerido: {skill.requiredLevel}, Artista: {skill.artistLevel || 'N/A'})
                                {skill.perfectMatch && <span style={{color: 'green', marginLeft: '5px'}}>(Coincidencia Perfecta)</span>}
                                {skill.partialMatch && !skill.perfectMatch && <span style={{color: 'orange', marginLeft: '5px'}}>(Coincidencia Parcial)</span>}
                              </li>
                            ) : null
                          )}
                        </ul>
                      </div>
                    )}
                     {prospect.missingEssentialSkills && prospect.missingEssentialSkills.length > 0 && (
                      <div className="skill-details-container" style={{marginTop: '5px', marginLeft: '15px', color: 'red'}}>
                        <strong>Habilidades Esenciales Faltantes:</strong>
                        <ul>
                          {prospect.missingEssentialSkills.map(skill => 
                            skill ? (
                              <li key={`missing-E-${skill.skillId}`}>
                                {skill.skillName} (Requerido: {skill.requiredLevel})
                              </li>
                            ) : null
                          )}
                        </ul>
                      </div>
                    )}
                    {prospect.missingDesirableSkills && prospect.missingDesirableSkills.length > 0 && (
                      <div style={{marginTop: '5px', marginLeft: '15px', color: 'darkorange'}}>
                        <strong>Habilidades Deseables Faltantes:</strong>
                        <ul>
                          {prospect.missingDesirableSkills.map(skill => 
                            skill ? (
                              <li key={`missing-D-${skill.skillId}`}>
                                {skill.skillName} (Requerido: {skill.requiredLevel})
                              </li>
                            ) : null
                          )}
                        </ul>
                      </div>
                    )}
                    <button
                      onClick={() => handleAssignArtist(approvedRequestId, prospect.artistInfo.id)}
                      disabled={isAssigning || isLoading}
                      style={{ marginLeft: '10px', marginTop: '10px' }}
                    >
                      {isAssigning ? 'Asignando...' : 'Asignar Artista'}
                    </button>
                  </li>
                ) : null
              )}
            </ul>
          )}
        </section>
      )}
      {approvedRequestId && !isLoading && assignmentProspects.length === 0 && !error && !isAssigning && (
         <p>No se encontraron prospectos de asignación para esta solicitud o fueron eliminados después de la asignación.</p>
      )}
      
      {currentApprovedRequestDetails && !isApproving && !isAssigning && (
        <button onClick={() => {
          setApprovedRequestId(null);
          setCurrentApprovedRequestDetails(null);
          setAssignmentProspects([]);
          setSuccessMessage(null); 
          setError(null); 
          fetchPendingRequests(); 
        }} className="view-other-requests-button" style={{marginTop: '20px'}}>
          Ver Otras Solicitudes Pendientes
        </button>
      )}
    </div>
  );
}

export default App;
