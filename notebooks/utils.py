"""Utility scripts related to the human bouncing ball task."""
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from loguru import logger

import index


def last_visible_color(samples, ball_radius, mask_start, mask_end, tol=1):
    """Determine the last visible RGB color of a ball before it fully enters a
    masked region in a series of trajectories represented by a 3D array.

    The function calculates the last visible timestep for each trajectory where
    the ball is not yet fully within the specified masked x-coordinate region,
    considering the ball's radius and a tolerance for near-edge visibility

    Parameters
    ----------
    samples : ndarray
        A 3D numpy array of shape (batch_size, timesteps, features), where each
        row represents a timestep in a trajectory, the first feature is the
        x-coordinate, and the last three features are expected to be RGB color
        values.

    ball_radius : float
        The radius of the ball. This is used to adjust the masked region to
        account for the entire ball potentially entering the masked region.

    mask_start : float
        The starting x-coordinate of the masked region.

    mask_end : float
        The ending x-coordinate of the masked region.

    tol : float, optional
        A tolerance value used to extend the masked region slightly inwards
        (default is 1). This allows for capturing the last visible color
        slightly before the ball is fully masked, depending on the specific
        application's precision requirements.

    Returns
    -------
    last_visible_color
        A 2D numpy array (ndarray) of shape (batch_size, features-2), where each
        row contains the RGB color values of the ball at the last visible
        timestep.
    """
    batch_size, timesteps, features = samples.shape

    # Create a boolean tensor indicating whether the timestep is within the
    # middle gray region or not
    x_coords = samples[:, :, 0]  # Extract the x-coordinates
    out_mask = ~(
        (x_coords >= (mask_start + ball_radius - tol))
        & (x_coords <= (mask_end - ball_radius + tol))
    )

    # Reverse the boolean tensor along the timesteps direction
    out_mask_reversed = np.flip(out_mask, axis=1)

    # Use argmax to find the first 1.0 in the reversed tensor, then calculating
    # timesteps - 1 - index gives the correct index in the original tensor
    first_out_mask_reversed = np.argmax(out_mask_reversed, axis=1)
    last_visible_index = timesteps - 1 - first_out_mask_reversed

    # Use this to index the original tensor for the last visible color
    last_visible_colors = samples[np.arange(batch_size), last_visible_index, 2:]

    return last_visible_colors  # , last_visible_index
