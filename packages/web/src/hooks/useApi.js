import { useQuery, useMutation, useQueryClient } from 'react-query';
import apiClient from '../api/apiClient';

/**
 * A generic hook for fetching data.
 * @param {string} queryKey - The key for the query.
 * @param {string} url - The URL to fetch data from.
 * @param {object} params - The query parameters.
 * @param {object} options - React Query options.
 * @returns The result of the useQuery hook.
 */
export const useFetch = (queryKey, url, params, options) => {
  const fetchData = async () => {
    const { data } = await apiClient.get(url, { params });
    return data.data;
  };

  return useQuery(queryKey, fetchData, options);
};

/**
 * A generic hook for creating data.
 * @param {string} url - The URL to post data to.
 * @param {string|array} invalidateQueriesKey - The query key to invalidate after mutation.
 * @returns The result of the useMutation hook.
 */
export const useCreate = (url, invalidateQueriesKey) => {
  const queryClient = useQueryClient();

  const createData = async (newData) => {
    const { data } = await apiClient.post(url, newData);
    return data.data;
  };

  return useMutation(createData, {
    onSuccess: () => {
      if (invalidateQueriesKey) {
        queryClient.invalidateQueries(invalidateQueriesKey);
      }
    },
  });
};

/**
 * A generic hook for updating data.
 * @param {string} url - The URL to put data to.
 * @param {string|array} invalidateQueriesKey - The query key to invalidate after mutation.
 * @returns The result of the useMutation hook.
 */
export const useUpdate = (url, invalidateQueriesKey) => {
  const queryClient = useQueryClient();

  const updateData = async ({ id, ...updateData }) => {
    const { data } = await apiClient.put(`${url}/${id}`, updateData);
    return data.data;
  };

  return useMutation(updateData, {
    onSuccess: () => {
      if (invalidateQueriesKey) {
        queryClient.invalidateQueries(invalidateQueriesKey);
      }
    },
  });
};

/**
 * A generic hook for deleting data.
 * @param {string} url - The URL to delete data from.
 * @param {string|array} invalidateQueriesKey - The query key to invalidate after mutation.
 * @returns The result of the useMutation hook.
 */
export const useDelete = (url, invalidateQueriesKey) => {
  const queryClient = useQueryClient();

  const deleteData = async (id) => {
    const { data } = await apiClient.delete(`${url}/${id}`);
    return data.data;
  };

  return useMutation(deleteData, {
    onSuccess: () => {
      if (invalidateQueriesKey) {
        queryClient.invalidateQueries(invalidateQueriesKey);
      }
    },
  });
};
