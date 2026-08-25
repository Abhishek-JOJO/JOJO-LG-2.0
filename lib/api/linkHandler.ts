import { apiClient } from '@/lib/api/client';
import { ApiEndpoint } from '@enums/api.enum';

export interface PolicyResponse {
  _id: string;
  policy_name: string;
  policy_description: string;
}

/**
 * Fetches the HTML content for a legal policy.
 * @param policyId - 1 for Privacy Policy, 2 for Terms & Conditions.
 * @returns The policy name and HTML description.
 */
export async function fetchPolicy(policyId: number, languageId: number): Promise<PolicyResponse> {
  const response = await apiClient.post<any>(
    ApiEndpoint.LINK_HANDLER,
    { policy_id: policyId, language_id: languageId },
    { encrypt: true }
  );

  // Handle nested response: { data: { _id, policy_name, policy_description } }
  const data = response?.data ?? response;

  if (data && typeof data === 'object' && 'policy_description' in data) {
    return {
      _id: data._id ?? '',
      policy_name: data.policy_name ?? '',
      policy_description: data.policy_description ?? '',
    };
  }

  // Fallback: if response is a raw HTML string
  if (typeof data === 'string') {
    return {
      _id: '',
      policy_name: policyId === 2 ? 'Terms & Conditions' : 'Privacy Policy',
      policy_description: data,
    };
  }

  throw new Error('Invalid response from policy endpoint');
}
