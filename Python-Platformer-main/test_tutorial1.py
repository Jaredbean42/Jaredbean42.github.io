import pygame
import pytest
from tutorial_attempt1 import Player, Block, WIDTH, HEIGHT, PLAYER_VEL, FPS

# Set up pygame display (needed for sprite surfaces to work)
pygame.display.init()
pygame.display.set_mode((WIDTH, HEIGHT))

# Test that the player moves left correctly
def test_player_move_left():
    player = Player(100, 100, 50, 50)
    x_before = player.rect.x
    player.move_left(PLAYER_VEL)
    player.move(player.x_vel, 0)
    assert player.rect.x < x_before
    assert player.direction == "left"

# Test that the player moves right correctly
def test_player_move_right():
    player = Player(100, 100, 50, 50)
    x_before = player.rect.x
    player.move_right(PLAYER_VEL)
    player.move(player.x_vel, 0)
    assert player.rect.x > x_before
    assert player.direction == "right"

# Test landing resets fall count and vertical velocity
def test_landing_resets_fall():
    player = Player(100, 100, 50, 50)
    player.fall_count = 10
    player.y_vel = 10
    player.landed()
    assert player.fall_count == 0
    assert player.y_vel == 0


# Run pytest when the script is executed directly
if __name__ == "__main__":
    pytest.main([__file__])
